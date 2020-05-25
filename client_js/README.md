<p align="center">
  <img src="https://ipfs.io/ipfs/QmaBvRuuYgX5nsJfKvLuJo3eDDTJUhuiUCwE7kT5gsbCgY" width="200px"/>
  <br>
  With the NanoProfile_client.js you can obtain user image registers, without having to install Replicator or an IPFS node.
  <br>You only need access to the RPC of a Nano node and an IPFS Gateway (can be a public gateway).
  <br>This process does not depend on any central server, so it is decentralized and P2P
  <br><br>
  <strong>Integrate now into your wallet, website or other apps NanoProfile client!</strong>
  <br>
  Check this web demo: http://nanoprofile.online/#demo
</p>

### Importing into Browsers:
```
<script type="text/javascript" src="blake2b.js"></script>
<script type="text/javascript" src="NanoProfile_client.js"></script>
```

### NodeJS

Dependencies:
```bash
  npm i node-fetch
```
Import the NanoProfile_client.js your your code:
```
const nanoProfile = require('./NanoProfile_client.js')
```
### Review config.json
- node: RPC address of a Nano node. If you installed using a docker, the address can be [:: 1]: 7076
- trackerAccount: The universal account to which registration transactions are sent.
- imageCode: Valid codes (in raws) that identify image registers
- ipfsGateway: An IPFS gateway allows you to obtain an IPFS file via http. You can use a public gateway like https://ipfs.io/ipfs/

### Example of use:

```javascript
function callbackSync (register) {
  if ("foundRegister" in register) {
    console.log ("Found register " + register.foundRegister)
  }
  if ("currentRegister" in register) {
    console.log ("Current register " + register.account + " = " + register.imageHash)
  }
}

async function main () {
  const loadConfig = await nanoProfile.importConfigFromFile("./config.json")
  if ("fail" in loadConfig) throw new Error ("Error importing config: " + loadConfig.fail)
  console.log (nanoProfile.CONFIG)

  const loadBlacklist = await nanoProfile.importBlacklistFromFile("blacklist.json")
  if ("fail" in loadBlacklist) throw new Error ("Error importing blacklist file: " + loadBlacklist.fail)

  const sync = await nanoProfile.synchronize(5, callbackSync)
  if ("successful" in sync) {
      console.log ("Sucessfully synchronized!")
      console.log ("Current account Images: " + sync.accountsImages
      console.log ("Total found registers: " + sync.totalRegisteredBlocks)
  } else {
      throw new Error ("Error synchronizing: " + sync.fail)
  }

  const accountImageFind = await nanoProfile.getAccountImage("nano_35g1u9tcf93khx1hjdsdgo1i6eu4bty6fsc8zifo7yfn368i9nweg3zfbz5p")
  //returns: {"successful": true, "block": "709BE02EA0C4111B985A51FAA4F4D4D758AFCA6F8F0FF2972EAAC8CF6F420DB3", "imageHash": "QmaBvRuuYgX5nsJfKvLuJo3eDDTJUhuiUCwE7kT5gsbCgY", "local_timestamp": "1589995691", "imageLink": "https://ipfs.io/ipfs/QmaBvRuuYgX5nsJfKvLuJo3eDDTJUhuiUCwE7kT5gsbCgY"}

  const registerNewImage = nanoProfile.registerImage("QmaBvRuuYgX5nsJfKvLuJo3eDDTJUhuiUCwE7kT5gsbCgY")
  //returns: {destination: "nano_1nanoprofi1e7defau1t7account7tracker7image7registerr4twum9q3", amount: "131000000000000000000000000", representative: "nano_3e1hscejr79qpw4cfg3r9wfzxqzmufrs7mwuoot5srw4nopi6e4jsfa6w3ze"}
}

main()

```

### Client Functions:

  - #### nanoProfile.importConfig(objectType)

    Imports NanoProfile client config from an object

    Example:
    ```javascript
       const config =  { "node": "http://127.0.0.1:7076",
                         "imageCode": ["131000000000000000000000000", "1315081206"],
                         "trackerAccount": "nano_1nanoprofi1e7defau1t7account7tracker7image7registerr4twum9q3",
                         "ipfsGateway": "https://ipfs.io/ipfs/"
                       }

       const loadConfig = await nanoProfile.importConfigFromFile("NanoProfile_client.js/config.json")
       if ("fail" in loadConfig) throw new Error ("Error importing config: " + loadConfig.fail)
     ```
  - #### nanoProfile.importConfigFromFile(filenameJSON)

    Imports NanoProfile client config from a JSON file

    Example:
      ```javascript
       const loadConfig = await nanoProfile.importConfigFromFile("./config.json")
       if ("fail" in loadConfig) throw new Error ("Error importing config file: " + loadConfig.fail)
     ```
  - #### nanoProfile.CONFIG

    Returns the imported config

    Example:
      ```javascript
        console.log(nanoProfile.CONFIG)
      ```
    Returns:
      ```json
        { "node": "http://127.0.0.1:7076",
           "imageCode": ["131000000000000000000000000", "1315081206"],
           "trackerAccount": "nano_1nanoprofi1e7defau1t7account7tracker7image7registerr4twum9q3",
           "ipfsGateway": "https://ipfs.io/ipfs/"
         }
      ```
  - #### nanoProfile.importBlacklist(blacklistObject)

     Imports the blacklist from an object

     Example:
      ```javascript
          //example 1 - account:
          const blacklist = {accounts: ["nano_35g1u9tcf93khx1hjdsdgo1i6eu4bty6fsc8zifo7yfn368i9nweg3zfbz5p"]}

         //example 2 - IPFS imageHash
          const blacklist = {hashs: ["QmaBvRuuYgX5nsJfKvLuJo3eDDTJUhuiUCwE7kT5gsbCgY", "QmeoAig3dpRuBGpK5H8KennyEdadeUsBwFAc2WLKbfnG45"]}

         //example 3 - Registers blocks
          const blacklist = {blocks: ["709BE02EA0C4111B985A51FAA4F4D4D758AFCA6F8F0FF2972EAAC8CF6F420DB3"]}

         //example 4 - All together:
          const blacklist = {accounts: ["nano_35g1u9tcf93khx1hjdsdgo1i6eu4bty6fsc8zifo7yfn368i9nweg3zfbz5p"], hashs: ["QmeoAig3dpRuBGpK5H8KennyEdadeUsBwFAc2WLKbfnG45"], blocks: ["709BE02EA0C4111B985A51FAA4F4D4D758AFCA6F8F0FF2972EAAC8CF6F420DB3"]}

          //import to blacklist
          const loadBlacklist = await nanoProfile.importBlacklist(blacklist)
          if ("fail" in loadBlacklist) alert ("Error importing blacklist: " + loadBlacklist.fail)
      ```

  - #### nanoProfile.importBlacklistFromFile(filenameJSON)

     Imports the blacklist from a JSON file

     Example:
      ```javascript
          const loadBlacklist = await nanoProfile.importBlacklistFromFile("blacklist.json")
          if ("fail" in loadBlacklist) throw new Error ("Error importing blacklist file: " + loadBlacklist.fail)
       ```

  - #### nanoProfile.synchronize(delay, callbackFunction)

      Synchronizes the registers in your client with the tracker account, using the Nano node.



      The first parameter (delay) will be the time between the search for new records and must be represented in seconds.
      For example, if you choose 5, new blocks will be searched every 5 seconds. This process is continuous, you only need to start synchronization once

      You can use a function (callback) to receive the new blocks.

      Example:
      ```javascript
        const sync = await nanoProfile.synchronize(5, callback)
        if ("successful" in sync) {
          console.log ("Sucessfully synchronized!")
          console.log ("Current account Images: " + sync.accountsImages
          console.log ("Total found registers: " + sync.totalRegisteredBlocks)
        } else {
          throw new Error ("Error synchronizing: " + sync.fail)
        }
      ````

  - #### nanoProfile.getAccountImage (nanoAddress)

    Search for an image record in the chosen account

     Example:
     ```javascript
       const image = await nanoProfile.getAccountImage("nano_35g1u9tcf93khx1hjdsdgo1i6eu4bty6fsc8zifo7yfn368i9nweg3zfbz5p")
     ```

     Sucessfull Return - Image Register Found in this account

     ```json
      {
        "successful": true, "block": "709BE02EA0C4111B985A51FAA4F4D4D758AFCA6F8F0FF2972EAAC8CF6F420DB3",
        "imageHash": "QmaBvRuuYgX5nsJfKvLuJo3eDDTJUhuiUCwE7kT5gsbCgY",
        "local_timestamp": "1589995691",
        "imageLink": "https://ipfs.io/ipfs/QmaBvRuuYgX5nsJfKvLuJo3eDDTJUhuiUCwE7kT5gsbCgY"
      }
     ```

     Fail Return = Image Register not found or was filtered by the blacklist
     ```json
        {"fail": "Not Found"}
     ```
  - #### nanoProfile.registerImage(imageHashIPFS)

    Returns the destination account (tracker account), representative and amount for you to register the selected image hash in your account.
    You just need to make a new transaction with such data.

    Example:
    ```javascript
     const registerNewImage = nanoProfile.registerImage("QmaBvRuuYgX5nsJfKvLuJo3eDDTJUhuiUCwE7kT5gsbCgY")
    ```
    Returns:
    ```json
      { "destination": "nano_1nanoprofi1e7defau1t7account7tracker7image7registerr4twum9q3",
        "amount": "131000000000000000000000000",
        "representative": "nano_3e1hscejr79qpw4cfg3r9wfzxqzmufrs7mwuoot5srw4nopi6e4jsfa6w3ze"
      }
    ```

  - #### nanoProfile.checkNanoAddress(nanoAddress)

    Checks if a specific Nano address is valid

    Example
    ```javascript
      if (nanoProfile.checkNanoAddress("nano_35g1u9tcf93khx1hjdsdgo1i6eu4bty6fsc8zifo7yfn368i9nweg3zfbz5p")) {
        console.log ("valid account")
      } else {
        console.log ("Invalid account")
      }
    ```

  - #### nanoProfile.checkIpfsHash(hashIPFS)

    Checks if a specific IPFS hash is valid

    Example:
    ```javascript
      if (nanoProfile.checkIpfsHash("QmaBvRuuYgX5nsJfKvLuJo3eDDTJUhuiUCwE7kT5gsbCgY")) {
        console.log ("valid hash")
      } else {
        console.log ("Invalid hash")
      }
    ```


 <p align="center">    
    <br><br>
   Donate Nano to this project:
    <br>
   <img src="https://ipfs.io/ipfs/QmNPPmsMvieRrpimUWLDtw7N8ouydnbjchh718iWYN3uqb" />
   <br>
   nano_35g1u9tcf93khx1hjdsdgo1i6eu4bty6fsc8zifo7yfn368i9nweg3zfbz5p
 </p>
