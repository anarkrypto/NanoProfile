if (isNodeJS()) {
  global.blake2b = require('./blake2b.js')
  global.fetch = require('node-fetch');
}

const nanoProfile = (function () {
  'use strict';

  let nanoProfile = {}
  let registered_blocks = {}
  let accountsImagesRegisters = []
  let accountsImages = []
  let synchronized = false
  let startSynchronization = false
  const alphabet = '13456789abcdefghijkmnopqrstuwxyz'
  const MAP = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let CONFIG = {}
  let BLACKLIST = {"accounts": [], "blocks": [], "hashs": []}

  //import config from json file
  async function importConfigFromFile (configFile) {
    let getConfig = ""
    if (!isNodeJS()) {
      getConfig = await loadJSON(configFile)
    } else {
      getConfig = require(configFile)
    }
    if ("error" in getConfig) {
      console.error ("error importing " + configFile + ": " + getConfig.error)
      return false
    }
    return importConfig(getConfig)
  }

  //get the last registered image of an account
  async function getAccountImage (account) {
    if (!checkNanoAddress(account)) return {fail: "Invalid Account Format!"}
    if (!startSynchronization) return {fail: "synchronize first!"}
    while (!synchronized) await sleep (100)
    if (account in accountsImages) {
      let accountImageInfo = accountsImages[account]
      accountImageInfo.imageLink = CONFIG.ipfsGateway + accountImageInfo.imageHash
      return {successful: true, ...accountImageInfo}
    } else {
      return {fail: "Not Found"}
    }
  }

  //Returns the correct destination, representative and amount to register an image's IPFS hash
  function registerImage (imageHash) {
    const uint = from_base58(imageHash).slice(-32)
    const representative = deriveAddress(byteArrayToHex(uint))
    return {destination: CONFIG.trackerAccount, amount: CONFIG.imageCode[0], representative: representative}
  }

  //Synchronize all Image registers from tracker account
  async function synchronize (delay, callback) {
    if ( !("node" in CONFIG) ) return {error: "Config not found. Import config.json first!"}
    if (isNaN(delay) || delay == 0) return {error: "Invalid Delay!"}
    const firstSync = await synchronizeRegisters(callback)
    if ("successful" in firstSync) {
      loopSynchronize(delay, callback)
      return {successful: true, accountsImages: Object.keys(accountsImages).length, totalRegisteredBlocks: Object.keys(registered_blocks).length}
    } else {
      return {fail: firstSync.fail + ". For more details check console"}
    }
  }

  function importConfig (getConfig) {
    if (typeof getConfig !== "object") return {"fail": "Invalid input! Send an object."}
    if ( !("trackerAccount" in getConfig) ) return {"fail": "trackerAccount not found in the config"}
    if ( !checkNanoAddress(getConfig.trackerAccount) ) return {"fail": "Invalid trackerAccount in the config file"}
    if ( !("imageCode" in getConfig) ) return {"fail": "imageCode not found in the config file"}
    if ( !("node" in getConfig) ) return {"fail": "node not found in the config file"}
    if ( !checkURL(getConfig.node) ) return {"fail": "Invalid node url in the config file"}
    if ( !("ipfsGateway" in getConfig) ) return {"fail": "ipfsGateway not found in the config file"}
    if ( !checkURL(getConfig.ipfsGateway) ) return {"fail": "Invalid ipfsGateway url in the config file"}
    CONFIG.trackerAccount = getConfig.trackerAccount
    CONFIG.imageCode = getConfig.imageCode
    CONFIG.node = getConfig.node
    CONFIG.ipfsGateway = getConfig.ipfsGateway
    return {successful: true}
  }

  async function importBlacklistFromFile(file) {
    let getJson = ""
    if (!isNodeJS()) {
      getJson = await loadJSON(file)
    } else {
      getJson = require(file)
    }
    if ("error" in getJson){
      return {fail: "error importing " + file + ": " + getJson.error}
    }
    return importBlacklist(getJson)
  }

  function importBlacklist(data) {
    if (typeof data !== "object") throw new Error ("Invalid input! Send an object.")
    const inputsCheck = {
      accounts: checkNanoAddress,
      blocks: checkKey,
      hashs: checkIpfsHash
    }
    for (let input in data) {
      if (input in inputsCheck) {
        for (let i in data[input]) {
          if (inputsCheck[input](data[input][i])) {
            BLACKLIST[input].push(data[input][i])
          } else {
            return {fail: "Invalid " + input + ": " + data[input][i]}
          }
        }
      } else {
        return {fail: "Invalid parameter: " + input}
      }
    }
    return {successful: true}
  }

  function checkBlacklist (data){
    for (let input in data) {
      if (BLACKLIST[input].includes(data[input])) return true
    }
    return false
  }

  async function loadJSON(file, callback) {
    try {
      const json = await fetch(file, {
        mode: 'no-cors',
      }).then(response => response.json());
      return json
    } catch (err) {
      return {"error": err}
    }
  }

  async function loopSynchronize(delay, callback) {
    while (true) {
      await sleep (delay * 1000)
      await synchronizeRegisters(callback)
    }
  }

  //save dict with all accounts and their registers
  async function synchronizeRegisters (callback) {
    try {
      startSynchronization = true
      let blockInfoAllPromises = [], determineCurrentRegisterPromises = [], newAccountsImagesRegisters = []
      const register_transactions = await pending_filter (CONFIG.trackerAccount, CONFIG.imageCode, -1)
      if ("error" in register_transactions) return {"fail": register_transactions.error}
      for (let blockN in register_transactions) {
        let block = register_transactions[blockN]
        if ( ! (block in registered_blocks) ) {
          let blockInfoPromise = block_info(block).then ( function (transaction) {
            registered_blocks[block] = transaction
            let account = transaction.account
            let imageHash = ipfsHashingByteArray(derivePublicKey(transaction.representative))
            let timestamp = transaction.local_timestamp
            if ( !(account in accountsImagesRegisters) ) accountsImagesRegisters[account] = []
            accountsImagesRegisters[account].push({block: block, imageHash: imageHash, local_timestamp: timestamp})
            if ( !(account in newAccountsImagesRegisters) ) newAccountsImagesRegisters[account] = []
            newAccountsImagesRegisters[account].push({block: block, imageHash: imageHash, local_timestamp: timestamp})
            if (callback && !checkBlacklist({accounts: account, blocks: block, hashs: imageHash})) callback({foundRegister: block, account: account, imageHash: imageHash, local_timestamp: timestamp})
          })
          blockInfoAllPromises.push(blockInfoPromise)
        }
      }
      await Promise.all(blockInfoAllPromises).then( function () {
        for (let account in newAccountsImagesRegisters){
          let newRegisters = newAccountsImagesRegisters[account].length
          if (newRegisters == 1) {
            accountsImages[account] = newAccountsImagesRegisters[account][0]
            if (callback && !checkBlacklist({accounts: account, blocks: accountsImages[account].block, hashs: accountsImages[account].imageHash})) callback({currentRegister: accountsImages[account].block, account: account, imageHash: accountsImages[account].imageHash, imageLink: CONFIG.ipfsGateway + accountsImages[account].imageHash, local_timestamp: accountsImages[account].local_timestamp})
          }
          if (newRegisters > 1){
            let determinePromise = determineLastImageRegister(account).then((register) => {
              accountsImages[account] = register
              if (callback && !checkBlacklist({accounts: account, blocks: accountsImages[account].block, hashs: accountsImages[account].imageHash})) callback({currentRegister: accountsImages[account].block, account: account, imageHash: accountsImages[account].imageHash, imageLink: CONFIG.ipfsGateway + accountsImages[account].imageHash, local_timestamp: register.local_timestamp})
            })
            determineCurrentRegisterPromises.push(determinePromise)
          }
        }
      });
      await Promise.all(determineCurrentRegisterPromises)
      synchronized = true
      return {"successful": true}
    } catch (err) {
      console.error (err)
      return {"fail": err}
    }
  }

  async function determineLastImageRegister (account){
    const history = await account_history(account)
    let blockInfo = {}
    for (let transactionN in history){
      let transaction = history[transactionN]
      if (transaction.type == "send" && transaction.account == CONFIG.trackerAccount && CONFIG.imageCode.includes(transaction.amount)){
        if (transaction.hash in registered_blocks) {
          blockInfo = registered_blocks[transaction.hash]
        } else {
          blockInfo = await block_info(transaction.hash)
        }
        const imageHash = ipfsHashingByteArray(derivePublicKey(blockInfo.representative))
        return {block: blockInfo.hash, imageHash: imageHash, local_timestamp: blockInfo.local_timestamp}
      }
    }
    return undefined
  }

  async function pending_filter(account, amounts, count) {
    if (typeof amounts !== "object") amounts = [amounts]
    let validTransactions = []
    try {
      const minAmount = ( function () {
        for (let i in amounts) {
          if (amounts[i] == Math.min(...amounts)) return (amounts[i]);
        }
      })()
      const request = await pending_transactions(account, minAmount)
      if ("error" in request) return {error: request.error}
      const blocks = request.blocks
      for (let block in blocks){
        if (amounts.includes(blocks[block])) validTransactions.push(block)
      }
      return validTransactions
    } catch(err) {
      console.error ("Error: " + err)
      return {error: err}
    }
  }

  function sleep (time) {
    return new Promise((resolve) => setTimeout(resolve, time));
  }

  //RPC Functions
  async function pending_transactions (account, threshold) {
    const data = {
      "action": "pending",
      "account": account,
      "count": -1,
      "threshold": threshold
    }
    try {
      const json = await fetch(CONFIG.node, {
        mode: 'cors',
        method: 'POST',
        body: JSON.stringify(data)
      }).then(response => response.json());
      return(json)
    } catch (err) {
      return {"error": err}
    }
  }

  async function block_info (hash) {
    let data = {
      "action": "block_info",
      "json_block": "true",
      "hash": hash
    }
    try {
      const json = await fetch(CONFIG.node, {
        mode: 'cors',
        method: 'POST',
        body: JSON.stringify(data)
      }).then(response => response.json());
      if ("contents" in json){
        let block = json.contents
        block.amount = json.amount
        block.hash = hash
        block.local_timestamp = json.local_timestamp
        return block
      } else {
        return {}
      }
    } catch (err) {
      return {"error": err}
    }
  }

  async function account_history (account) {
    const data = {
      "action": "account_history",
      "account": account,
      "count": -1
    }
    try {
      const json = await fetch(CONFIG.node, {
        mode: 'cors',
        method: 'POST',
        body: JSON.stringify(data)
      }).then(response => response.json());
      return(json["history"])
    } catch (err) {
      return {"error": err}
    }
  }


  //nano key Functions
  function derivePublicKey (address){
    const prefixLength = address.indexOf('_') + 1
    const publicKeyBytes = decodeNanoBase32(address.substr(prefixLength, 52))
    return publicKeyBytes
  }

  function deriveAddress (publicKey, prefix) {
    if (!checkKey(publicKey)) throw new Error('Public key is not valid')
    if (!prefix) prefix = "nano_"
    const publicKeyBytes = hexToByteArray(publicKey)
    const paddedPublicKeyBytes = hexToByteArray(publicKey)
    const encodedPublicKey = encodeNanoBase32(paddedPublicKeyBytes)
    const checksum = blake2b(publicKeyBytes, null, 5).reverse()
    const encodedChecksum = encodeNanoBase32(checksum)
    return prefix + encodedPublicKey + encodedChecksum
  }

  function checkKey(key) {
    if (/^([0-9A-F]){64}$/i.test(key)) {
      return true
    } else {
      return false
    }
  }

  function checkURL(str) {
    const pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
      '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
      '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
      '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
      '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
      '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
    return !!pattern.test(str);
  }

  function checkNanoAddress(address){
    const parseResult = parseNanoAddress(address)
    return parseResult.valid
  }

  function checkString(candidate) {
    return typeof candidate === 'string'
  }

  function parseNanoAddress(address) {
    const invalid = { valid: false, publicKey: null, publicKeyBytes: null }
    if (!checkString(address) || !/^(xrb_|nano_)[13][13-9a-km-uw-z]{59}$/.test(address)) {
      return invalid
    }
    let prefixLength = address.indexOf('_') + 1
    const publicKeyBytes = decodeNanoBase32(address.substr(prefixLength, 52))
    const publicKey = byteArrayToHex(publicKeyBytes)
    const checksumBytes = decodeNanoBase32(address.substr(-8))
    const computedChecksumBytes = blake2b(publicKeyBytes, null, 5).reverse()
    const valid = compareArrays(checksumBytes, computedChecksumBytes)
    if (!valid) return invalid
    return {
      publicKeyBytes,
      publicKey,
      valid: true
    }
  }

  function compareArrays(array1, array2) {
    for (let i = 0; i < array1.length; i++) {
      if (array1[i] !== array2[i]) return false
    }
    return true
  }

  function hexToByteArray(hex) {
    let bytes = [], c
    for (c = 0; c < hex.length; c += 2)
    bytes.push(parseInt(hex.substr(c, 2), 16));
    return new Uint8Array(bytes);
  }

  function byteArrayToHex(bytes) {
    let hex = []
    for (let i = 0; i < bytes.length; i++) {
        let current = bytes[i] < 0 ? bytes[i] + 256 : bytes[i];
        hex.push((current >>> 4).toString(16));
        hex.push((current & 0xF).toString(16));
    }
    return hex.join("").toUpperCase();
  }

  function encodeNanoBase32(view) {
    const length = view.length
    const leftover = (length * 8) % 5
    const offset = leftover === 0 ? 0 : 5 - leftover

    let value = 0
    let output = ''
    let bits = 0

    for (let i = 0; i < length; i++) {
      value = (value << 8) | view[i]
      bits += 8

      while (bits >= 5) {
        output += alphabet[(value >>> (bits + offset - 5)) & 31]
        bits -= 5
      }
    }

    if (bits > 0) {
      output += alphabet[(value << (5 - (bits + offset))) & 31]
    }

    return output
  }

  function readChar(char) {
    const idx = alphabet.indexOf(char)

    if (idx === -1) {
      throw new Error(`Invalid character found: ${char}`)
    }

    return idx
  }

  function decodeNanoBase32(input) {
    const length = input.length
    const leftover = (length * 5) % 8
    const offset = leftover === 0 ? 0 : 8 - leftover

    let bits = 0
    let value = 0

    let index = 0
    let output = new Uint8Array(Math.ceil((length * 5) / 8))

    for (let i = 0; i < length; i++) {
      value = (value << 5) | readChar(input[i])
      bits += 5

      if (bits >= 8) {
        output[index++] = (value >>> (bits + offset - 8)) & 255
        bits -= 8
      }
    }
    if (bits > 0) {
      output[index++] = (value << (bits + offset - 8)) & 255
    }

    if (leftover !== 0) {
      output = output.slice(1)
    }
    return output
  }


  //IPFS hashing
  function ipfsHashingByteArray (uint8array){
      const hashType = new Uint8Array ([18, 32]) //IPFS hash identification, 12 20 in HEX
      const combined = new Uint8Array([
      ...hashType,
      ...uint8array
      ]);
      const multihash = to_base58 (combined)
      return multihash
  }

  function checkIpfsHash(hash) {
    if (hash.length != 46) return false
    if (!hash.startsWith("Qm")) return false
    if (from_base58(hash) == undefined) return false
    return true
  }

  function to_base58 (uint8array) {
    const B = uint8array
    const A = MAP
    let d=[],s="",i,j,c,n;
    for (i in B) {
      j = 0, c = B[i];
      s += c || s.length ^ i ? "" : 1;
      while (j in d || c){
        n = d[j];
        n = n ? n * 256 + c : c;
        c = n / 58 | 0;
        d[j] = n % 58;
        j++
      }
    }
    while(j--) s += A[d[j]];
    return s
  }

  function from_base58 (str) {
    const S = str
    const A = MAP
    let d=[],b=[],i,j,c,n;
    for(i in S){
      j = 0, c = A.indexOf(S[i]);
      if(c < 0) return undefined;
      c || b.length ^ i ? i : b.push(0);
      while(j in d || c){
        n = d[j];
        n = n ? n * 58 + c : c;
        c = n >> 8;
        d[j] = n % 256;
        j++
      }
    }
    while(j--) b.push(d[j]);
    return new Uint8Array(b)
  }

  nanoProfile.importConfig = importConfig
  nanoProfile.importConfigFromFile = importConfigFromFile
  nanoProfile.CONFIG = CONFIG
  nanoProfile.synchronize = synchronize
  nanoProfile.getAccountImage = getAccountImage
  nanoProfile.registerImage = registerImage
  nanoProfile.importBlacklist = importBlacklist
  nanoProfile.importBlacklistFromFile = importBlacklistFromFile
  nanoProfile.checkNanoAddress = checkNanoAddress
  nanoProfile.ipfsHashingByteArray = ipfsHashingByteArray
  nanoProfile.checkIpfsHash = checkIpfsHash

  return nanoProfile

})()

function isNodeJS() {
  if (typeof window === 'undefined') {
    return true
  } else {
    return false
  }
}

if (isNodeJS()) module.exports = nanoProfile
