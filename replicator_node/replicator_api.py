import json
import copy
import _thread
from time import sleep
import base58
import ipfshttpclient
import requests
import waitress
from flask import Flask, request, jsonify
from flask_cors import CORS
from nanolib import get_account_public_key, validate_account_id

app = Flask(__name__)
CORS(app)

@app.route('/', methods=['GET', 'POST'])
def api():
    global synchronized, ipfs_storage_info
    if synchronized == False:
        return {"error": "Not synchronized yet"}
    try:
        data = json.loads(request.data.decode('utf8').replace("'", '"'))
    except ValueError as err:
        return {"error": "Invalid request. Encode in JSON!"}
    if "account" in data:
        account = data.get("account").replace("xrb_", "nano_")
        if validateAccount(account):
            if account in registers and registers[account]["current"]["imageHash"] != "" and checkOnTheBlacklist(account) == False:
                ipfsHashImage = registers[account]["current"]["imageHash"]
                timestamp = registers[account]["current"]["local_timestamp"]
                block = registers[account]["current"]["block"]
                for file in ipfs_storage_info:
                    if ipfsHashImage == file["Hash"]:
                        imageSize = file["Size"]
                return {"successful": True, "account": account, "imageHash": ipfsHashImage, "blockRegister": block, "imageSize": imageSize, "imageLink": CONFIG["ipfs_gateway"] + "/ipfs/" + ipfsHashImage, "localTimestamp": timestamp}
            else:
                return {"fail": "Not Found"}
        else:
            return {"error": "Invalid Account"}
    else:
        return {"error": "Arguments Missing: Account"}
    return {"error": "Send your account as post"}

def startAPI (threadName, val):
    waitress.serve(app, host=CONFIG["api_access"], port=CONFIG["api_port"])

def toURL(address):
    if not address.startswith("http"):
        return "http://" + address
    else:
        return address

def validateAccount (account):
    try:
        validate = validate_account_id(account)
        if validate == account:
            return True
    except:
        return False

#block info contents
def block_info (hash):
    try :
        block = {}
        request = requests.post(CONFIG["nano_node"], json={"action": "block_info", "hash": hash, "json_block": "true"})
        if "contents" in request.json():
            block = request.json()["contents"]
            block["amount"] = request.json()["amount"]
            block["hash"] = hash
            block["local_timestamp"] = request.json()["local_timestamp"]
        return block
    except Exception as err:
        print ("Error: " + str(err))
        return ""

#filter specific pending transaction from some account
def pending_filter (account, amounts, count):
    validTransactions = []
    try :
        request = requests.post(CONFIG["nano_node"], json={"action": "pending", "account": account, "count": count, "threshold": str(min([int(i) for i in CONFIG["image_code"]]))})
        blocks = request.json()["blocks"]
        for block in blocks:
            if str(blocks[block]) in amounts:
                validTransactions.append(block)
        return validTransactions
    except Exception as err:
        print ("Error: " + str(err))
        return []

def account_history (account):
    try:
        request = requests.post(CONFIG["nano_node"], json={"action": "account_history", "account": account, "count": "-1"})
        history = request.json()["history"]
        if history == "":
            return []
        else:
            return history
    except Exception as err:
        print ("Error: " + str(err))
        return []

def saveRegisters (json_data):
    with open(CONFIG["register_transactions_json"], 'w') as register_file:
        register_file.write(json_data)

def saveIpfsFileInfo (IpfsFileInfo):
    global ipfs_storage_info
    for ipfsFile in ipfs_storage_info:
        if IpfsFileInfo["Hash"] in ipfsFile:
            if IpfsFileInfo["accounts"] not in ipfsFile["accounts"]:
                ipfs_storage_info[ipfsFile]["accounts"].append(IpfsFileInfo["accounts"][0])
                with open(CONFIG["ipfs_storage_json"], 'w') as ipfs_files_info:
                    ipfs_files_info.write(json.dumps(ipfs_storage_info))
            return 0
    ipfs_storage_info.append(IpfsFileInfo)
    with open(CONFIG["ipfs_storage_json"], 'w') as ipfs_files_info:
        ipfs_files_info.write(json.dumps(ipfs_storage_info))

def checkStorageUsed ():
    global ipfs_storage_info
    totalSize = 0
    for ipfsFile in ipfs_storage_info:
        totalSize += ipfsFile["Size"]
    return totalSize

def compareLists (list1, list2):
    extras = []
    for el in list1:
        if el not in list2:
            extras.append(el)
    return extras

def ipfsHashing (nano_account):
    public_key = get_account_public_key(account_id=nano_account)
    hashType = "1220"
    unencoded_string = bytes.fromhex( hashType + public_key )
    multihash = base58.b58encode(unencoded_string)
    return multihash.decode('utf-8')

def saveImage (threadName, ipfsHash, account):
    global ipfsClient
    print ("Saving new image: " + ipfsHash)
    try:
        objectInfo = ipfsClient.files.stat("/ipfs/"+ipfsHash)
        if objectInfo["Type"] != "file":
            print ("Invalid IPFS Object. Not a file")
            ipfsClient.repo.gc()
            return False
        if objectInfo["Size"] > CONFIG["max_image_size"]:
            print ("Invalid image size: " + objectInfo["Size"])
            ipfsClient.repo.gc()
            return False
        storageUsed = checkStorageUsed()
        if (storageUsed + objectInfo["Size"]) > CONFIG["max_storage_size"]:
            print ("Storage Limit Reached")
            return False
        ipfsClient.pin.add(ipfsHash)
        objectInfo["accounts"] = [account]
        print ("Saved successfully: " + ipfsHash)
        saveIpfsFileInfo(objectInfo)
    except Exception as err:
        print ("Error saving " + ipfsHash + ": " + str(err))

def removeAccountImage (account):
    global ipfsClient, ipfs_storage_info
    for fileInfo in ipfs_storage_info:
        if account in fileInfo["accounts"]:
            fileInfo["accounts"].remove(account)
            if len(fileInfo["accounts"]) == 0:
                print ("Removing image: " + fileInfo["Hash"])
                ipfsClient.pin.rm(fileInfo["Hash"])
                ipfsClient.repo.gc()
                ipfs_storage_info.remove(fileInfo)
    with open(CONFIG["ipfs_storage_json"], 'w') as ipfs_files_info:
        ipfs_files_info.write(json.dumps(ipfs_storage_info))

def removeImage (ipfsHash):
    global ipfsClient, ipfs_storage_info
    for fileInfo in ipfs_storage_info:
        if fileInfo["Hash"] == ipfsHash:
            ipfs_storage_info.remove(fileInfo)
            print ("Removing image: " + ipfsHash)
            ipfsClient.pin.rm(ipfsHash)
            ipfsClient.repo.gc()
    with open(CONFIG["ipfs_storage_json"], 'w') as ipfs_files_info:
        ipfs_files_info.write(json.dumps(ipfs_storage_info))

def readSavedTransactions ():
    global registers, registered_blocks
    with open(CONFIG["register_transactions_json"]) as register_file:
        registers = json.load(register_file)
        for account in registers:
            for register in registers[account]["registers"]:
                registered_blocks[register["block"]] = {"account": account, "imageHash": register["imageHash"], "local_timestamp": register["local_timestamp"]}

def readSavedIpfsImages ():
    global ipfs_storage_info
    with open(CONFIG["ipfs_storage_json"]) as ipfs_register:
        ipfs_storage_info = json.load(ipfs_register)

def checkOnTheBlacklist (account):
    register = registers[account]["current"]
    if account in BLACKLIST["accounts"]:
        return True
    if register["imageHash"] in BLACKLIST["hashs"]:
        return True
    if register["block"] in BLACKLIST["blocks"]:
        return True
    return False

def removeBlacklistItems ():
    global ipfs_storage_info
    for fileInfo in ipfs_storage_info:
        for account in fileInfo["accounts"]:
            if (account in BLACKLIST["accounts"]):
                removeAccountImage(account)

        for block in BLACKLIST["blocks"]:
            if (registered_blocks[block]["account"] in fileInfo["accounts"]):
                removeAccountImage(registered_blocks[block]["account"])

        if fileInfo["Hash"] in BLACKLIST["hashs"]:
            removeImage(fileInfo["Hash"])


def ipfsClientConnect ():
    global ipfsClient
    try:
        ipfsConnectTo = "/ip4/" + CONFIG["ipfs_node"] + "/tcp/" + CONFIG["ipfs_api_port"] + "/http"
        ipfsClient = ipfshttpclient.connect(ipfsConnectTo)
        print("Successfully connected to IPFS API")
    except ipfshttpclient.exceptions.ConnectionError as err:
        print("Failed connecting to IPFS API: " + str(err))
        exit()

def determineLastRegister (account):
    history = account_history(account)
    for transaction in history:
        if transaction["type"] == "send" and transaction["account"] == CONFIG["tracker_account"] and transaction["amount"] in CONFIG["image_code"]:
            return transaction["hash"]

#save dict with all accounts and their registers
def synchronizeRegisters ():
    global registered_blocks, registers
    register_transactions = pending_filter (CONFIG["tracker_account"], CONFIG["image_code"], -1)
    for block in register_transactions:
        if block not in registered_blocks:
            transaction = block_info(block)
            account = transaction["account"]
            representative = transaction["representative"]
            timestamp = transaction["local_timestamp"]
            if account not in registers:
                registers[account] = {"registers": [], "current": {"imageHash": "", "block": "", "local_timestamp": ""}}
            registers[account]["registers"].append({"block": block, "imageHash": ipfsHashing(representative), "local_timestamp": timestamp})
            registered_blocks[block] = {"account": account, "imageHash": ipfsHashing(representative), "local_timestamp": timestamp}
            print ("New block: " + block)


def main (threadName, val):
    global synchronized, registers

    ipfsClientConnect()
    readSavedTransactions()
    readSavedIpfsImages()
    removeBlacklistItems()

    print ("Synchronizing...")

    while (True):
        registersBefore = copy.deepcopy(registers)
        synchronizeRegisters()
        synchronized = True
        for account in registers:
            if account not in registersBefore:
                registersBefore[account] = {"registers": [], "current": {}}
            newRegisters = compareLists(registers[account]["registers"], registersBefore[account]["registers"])
            if (len(newRegisters)):
                if len(newRegisters) == 1:
                    print ("1 New register: " + account)
                    transaction_register = newRegisters[0]
                    ipfsHashImage = transaction_register["imageHash"]
                    last_block_register = transaction_register["block"]
                if len(newRegisters) > 1:
                    print ("Multiples registers: " + account)
                    last_block_register = determineLastRegister(account)
                    transaction_register = block_info(last_block_register)
                    ipfsHashImage = ipfsHashing(transaction_register["representative"])

                if registers[account]["current"]["imageHash"] != ipfsHashImage:
                    if registers[account]["current"]["imageHash"] != "":
                        removeAccountImage(account)
                    if (account not in BLACKLIST["accounts"] and ipfsHashImage not in BLACKLIST["hashs"] and last_block_register not in BLACKLIST["blocks"]):
                        try:
                            _thread.start_new_thread(saveImage, ("saveImage_"+ipfsHashImage, ipfsHashImage, account))
                        except Exception as err:
                            print ("Error: unable to start saveImage thread. Reason: " + str(err))
                    else:
                        print ("Found on the Blacklist. The content will not be saved")
                else:
                    print ("Nothing to do. Old and new images are the same")

                registers[account]["current"] = {"imageHash": ipfsHashImage, "block": last_block_register, "local_timestamp": transaction_register["local_timestamp"]}

                saveRegisters(json.dumps(registers))

        sleep (CONFIG["sleep_synchronize"])

ipfsClient = ""
synchronized = False
registered_blocks = {}
registers = {}
ipfs_storage_info = []

#Import config and blacklist
try:
    with open('config.json') as configJSON:
        dataConfig = json.load(configJSON)
    CONFIG = {
        "nano_node": toURL(dataConfig['nano_node']),
        "tracker_account": dataConfig['tracker_account'].replace("xrb_", "nano_"),
        "image_code": dataConfig['image_code'],
        "max_image_size": dataConfig['max_image_size'],
        "max_storage_size": dataConfig['max_storage_size'],
        "blacklist": dataConfig['blacklist'],
        "register_transactions_json": dataConfig['register_transactions_json'],
        "ipfs_storage_json": dataConfig['ipfs_storage_json'],
        "ipfs_node": dataConfig['ipfs_node'],
        "ipfs_api_port": dataConfig["ipfs_api_port"],
        "ipfs_gateway": dataConfig["ipfs_gateway"],
        "api_access": dataConfig['api_access'],
        "api_port": dataConfig['api_port'],
        "sleep_synchronize": dataConfig['sleep_synchronize']
    }
    with open(CONFIG["blacklist"]) as blacklistSON:
        dataBlacklist = json.load(blacklistSON)
    BLACKLIST = {
        "accounts": dataBlacklist["accounts"],
        "blocks": dataBlacklist["blocks"],
        "hashs": dataBlacklist["hashs"]
    }
except Exception as err:
    print ("Error importing configs from config.json: " + str(err))

try:
   _thread.start_new_thread( startAPI, ("Thread_startAPI", "") )
   _thread.start_new_thread( main, ("Thread_main", "") )
except Exception as err:
   print ("Error: unable to start thread. Reason: " + str(err))

while 1:
   pass


#example api request with curl:
#curl -s --header "Content-Type: application/json" --request POST --data '{"account": "nano_35g1u9tcf93khx1hjdsdgo1i6eu4bty6fsc8zifo7yfn368i9nweg3zfbz5p"}' localhost:8088
