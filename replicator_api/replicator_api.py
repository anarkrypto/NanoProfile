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
    global synchronized
    global registeredImages
    global ipfs_storage_info
    if synchronized == False:
        return {"error": "Not synchronized yet"}
    try:
        data = json.loads(request.data.decode('utf8').replace("'", '"'))
    except ValueError as err:
        return {"error": "Invalid request. Encode in JSON!"}
    if "account" in data:
        account = data.get("account").replace("xrb_", "nano_")
        if validateAccount(account):
            if account in registeredImages:
                ipfsHashImage = registeredImages[account]
                print (ipfs_storage_info)
                for file in ipfs_storage_info:
                    if ipfsHashImage == file["Hash"]:
                        imageSize = file["Size"]
                return {"successfull": True, "imageHash": ipfsHashImage, "size": imageSize, "imageLink": CONFIG["ipfs_gateway"] + "/ipfs/" + ipfsHashImage}
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
        request = requests.post(CONFIG["nano_node"], json={"action": "block_info", "hash": hash, "json_block": "true"})
        return request.json()["contents"]
    except Exception as err:
        print ("Error: " + str(err))
        return ""

#filter specific pending transaction from some account
def pending_filter (account, amount, count):
    validTransactions = []
    try :
        request = requests.post(CONFIG["nano_node"], json={"action": "pending", "account": account, "count": count, "threshold": amount})
        blocks = request.json()["blocks"]
        for block in blocks:
            if str(blocks[block]) == str(CONFIG["image_code"]):
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

#save dict with all accounts and their registers
def synchronizeRegisters ():
    global registered_blocks
    global registeredImagesTransactions
    register_transactions = pending_filter (CONFIG["tracker_account"], CONFIG["image_code"], -1)
    for block in register_transactions:
        if block not in registered_blocks:
            transaction = block_info(block)
            account = transaction["account"]
            representative = transaction["representative"]
            if account not in registeredImagesTransactions:
                registeredImagesTransactions[account] = []
            registeredImagesTransactions[account].append({"block": block, "image": representative})
            registered_blocks.append(block)
            print ("New block: " + block)

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

def removeImage (ipfsHash):
    global ipfsClient
    print ("Removing old image: " + ipfsHash)
    ipfsClient.pin.rm(ipfsHash)
    ipfsClient.repo.gc()

def determineLastRegister (account):
    history = account_history(account)
    for transaction in history:
        if transaction["type"] == "send" and transaction["account"] == CONFIG["tracker_account"] and transaction["amount"] == CONFIG["image_code"]:
            return transaction["hash"]

def readSavedTransactions ():
    global registeredImagesTransactions, registered_blocks
    with open(CONFIG["register_transactions_json"]) as register_file:
        registeredImagesTransactions = json.load(register_file)
        for account in registeredImagesTransactions:
            for register in registeredImagesTransactions[account]:
                registered_blocks.append(register["block"])

def readSavedIpfsImages ():
    global ipfs_storage_info, registeredImages
    with open(CONFIG["ipfs_storage_json"]) as ipfs_register:
        ipfs_storage_info = json.load(ipfs_register)
        for file in ipfs_storage_info:
            for account in file["accounts"]:
                registeredImages[account] = file["Hash"]
                print (account + ": " + file["Hash"])

def ipfsClientConnect ():
    global ipfsClient
    try:
        ipfsConnectTo = "/ip4/" + CONFIG["ipfs_node"] + "/tcp/" + CONFIG["ipfs_api_port"] + "/http"
        ipfsClient = ipfshttpclient.connect(ipfsConnectTo)
        print("Successfully connected to IPFS API")
    except ipfshttpclient.exceptions.ConnectionError as err:
        print("Failed connecting to IPFS API: " + str(err))
        exit()

def main (threadName, val):
    global synchronized, registeredImages, registeredImagesTransactions

    ipfsClientConnect()
    readSavedTransactions()
    readSavedIpfsImages()

    while (True):
        registeredImagesTransactionsBefore = copy.deepcopy(registeredImagesTransactions)
        synchronizeRegisters()
        synchronized = True
        for account in registeredImagesTransactions:
            if account not in registeredImagesTransactionsBefore:
                registeredImagesTransactionsBefore[account] = []
            newRegisters = compareLists(registeredImagesTransactions[account], registeredImagesTransactionsBefore[account]) #len(registeredImagesTransactions[account]) - len(registeredImagesTransactionsBefore[account])
            if (len(newRegisters)):
                if len(newRegisters) == 1:
                    print ("1 New register: " + account)
                    ipfsHashImage = ipfsHashing(newRegisters[0]["image"])
                if len(newRegisters) > 1:
                    print ("Multiples registers: " + account)
                    last_register = determineLastRegister(account)
                    transaction_register = block_info(last_register)
                    ipfsHashImage = ipfsHashing(transaction_register["representative"])
                if account not in registeredImages:
                    registeredImages[account] = ""
                if registeredImages[account] == ipfsHashImage and registeredImages[account] != "":
                    print ("Nothing to do! The new image is the same as the previous one.")
                if registeredImages[account] != ipfsHashImage:
                    if registeredImages[account] != "":
                        removeImage(registeredImages[account])
                    registeredImages[account] = ipfsHashImage
                    #saveImage(ipfsHashImage, account)
                    try:
                        _thread.start_new_thread(saveImage, ("saveImage_"+ipfsHashImage, ipfsHashImage, account))
                    except Exception as err:
                       print ("Error: unable to start thread. Reason: " + str(err))
                saveRegisters(json.dumps(registeredImagesTransactions))
        sleep (CONFIG["sleep_synchronize"])

ipfsClient = ""
synchronized = False
registered_blocks = []
registeredImages = {}
registeredImagesTransactions = {}
ipfs_storage_info = []

#Import config
try:
    with open('config.json') as configJSON:
        dataConfig = json.load(configJSON)
    CONFIG = {
        "nano_node": toURL(dataConfig['nano_node']),
        "tracker_account": dataConfig['tracker_account'].replace("xrb_", "nano_"),
        "image_code": dataConfig['image_code'],
        "max_image_size": dataConfig['max_image_size'],
        "max_storage_size": dataConfig['max_storage_size'],
        "register_transactions_json": dataConfig['register_transactions_json'],
        "ipfs_storage_json": dataConfig['ipfs_storage_json'],
        "ipfs_node": dataConfig['ipfs_node'],
        "ipfs_api_port": dataConfig["ipfs_api_port"],
        "ipfs_gateway": dataConfig["ipfs_gateway"],
        "api_access": dataConfig['api_access'],
        "api_port": dataConfig['api_port'],
        "sleep_synchronize": dataConfig['sleep_synchronize']
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


#example with curl:
#curl -s --header "Content-Type: application/json" --request POST --data '{"account": "nano_35g1u9tcf93khx1hjdsdgo1i6eu4bty6fsc8zifo7yfn368i9nweg3zfbz5p"}' localhost:8088
