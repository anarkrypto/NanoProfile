<img src="https://ipfs.io/ipfs/QmZTP1G2BGQB43XbwoAmzeDrft4gsgWacxXBE2gHvK3S31" />

<strong>Replicator Node</strong> is an important component of the Nano Profile project.

With it, individuals can voluntarily help to store and distribute profile pictures of Nano users.

The images are linked by the users themselves in their Nano account, sending a micro-transaction containing the image hash to a default Nano account. The Replicator API remains synchronized with this public record through a Nano Node, through which it finds new images and stores and distributes them through their IPFS node.

Each Replicator can have their storage limit adjusted as desired.
The current records of the images can be accessed via POST method.

## Before we start

First you need to have a Nano node >= v.19.0 synchronized and an IPFS node

Install Nano node: https://docs.nano.org/running-a-node/node-setup/#installing-docker

Install IPFS node:
https://docs.ipfs.io/introduction/usage/

## Clone the repository

Install dependencies (Linux debian-based systems):

```bash
    sudo apt intall git python3 python3-pip
```

Clone rep:
```bash
    git clone https://github.com/anarkrypto/NanoProfile.git
```

Go to replicator_api directory:

```bash
  cd NanoProfile
  cd replicator_api
```

### Review the config.json

Here we have the main information to be followed by replicator_api.py.
Some variables can be edited as needed.

- nano_node: RPC address of a Node Nano >= v19.0 (usually [::1]:7076 or 127.0.0.1:7076). If you are using docker to run the Nano node, it will probably be [::1]:7076

- tracker_account: Account to which transactions of image registers are sent, allowing replicators to find them. Default: nano_1nanoprofi1e7defau1t7account7tracker7image7registerr4twum9q3

- image_code: Codes in raws that indetify the image registration transaction.

- max_image_size: Maximum image size in bytes. Default: 256000 (256 kilobytes)

- max_storage_size: Maximum storage space to be used (in bytes). Default: 5000000000 (5GB)

- blacklist: JSON file containing nano accounts, blocks or hashes of the images to be discarded / deleted / ignored by the node.

- register_transactions_json: JSON file to store registration of all transactions. It allows that when starting the application, it is synchronized with its last records.

- ipfs_storage_json: JSON file to store registration of the current images being stored in the IPFS node. It allows to manage the use of the IPFS and calculate storage usage.

- ipfs_node: IPFS node address for communication via API, 127.0.0.1 if local

- ipfs_api_port: API port of the IPFS node. 5001 by default

- ipfs_gateway: IPFS gateway through which files can be accessed via GET url (http). It can be the same node on port 8080 (default) or a public gateway for external use.

- api_access: Limits access to this application's API, used to find user images. Default 127.0.0.1 (local). If you want to expose to the network, use 0.0.0.0 and open your firewall

- api_port: Port for this application API

- sleep_synchronize: Waiting time between checks for new image records. Default: 5 seconds


## Installing and running the Replicator API

- Make sure your Nano node is already fully synchronized.
- If you have not started your IPFS node yet:
  - Initialize the repository: ``` ipfs init ```
  - Taking your Node Online: ``` ipfs daemon ```

- Clone this repository: ``` git clone https://github.com/anarkrypto/NanoProfile.git ```
- In the replicator directory, install the project's python modules: ``` cd NanoProfile/replicator_api && pip3 install -r requirements.txt ```
- Now just run: ``` python3 replicator_api.py ```

If all is well, you will see a log like this:

<img src="https://ipfs.infura.io/ipfs/QmYSaMdyTB65GCtM5qoxMWaanhaAGMbnEcJdJks6oGZxHg" />

Then your replicator node is working!


## Acessing Replicator API

Example Request:
```
curl -s --header "Content-Type: application/json" --request POST --data '{"account": "nano_35g1u9tcf93khx1hjdsdgo1i6eu4bty6fsc8zifo7yfn368i9nweg3zfbz5p"}' 127.0.0.1:8088
```

Successfull Response - Account Register Found:
```
{"successfull":true, "account":"nano_35g1u9tcf93khx1hjdsdgo1i6eu4bty6fsc8zifo7yfn368i9nweg3zfbz5p","blockRegister":"709BE02EA0C4111B985A51FAA4F4D4D758AFCA6F8F0FF2972EAAC8CF6F420DB3","imageHash":"QmaBvRuuYgX5nsJfKvLuJo3eDDTJUhuiUCwE7kT5gsbCgY","imageLink":"https://ipfs.io/ipfs/QmaBvRuuYgX5nsJfKvLuJo3eDDTJUhuiUCwE7kT5gsbCgY","imageSize":57589,"localTimestamp":"1589995691"}
```
Fail: Account Register Not found
```
{"fail": "Not Found"}
```
- sucessfull or false: Indicates whether the account was found and has a valid record or not.
- account: The Nano Account
- blockRegister: Nano transaction block in which the user registered his last image
- imageHash: IPFS hash of the registered image
- imageLink: External Link to access the image through  an IPFS gateway
- imageSize: Image size in bytes
- localTimeStamp: The time and date when the Nano node of the replicator received the image register transaction, formated in unix timestamp epoch format. This value can vary from node to node, since the Nano network is asynchronous, but it brings something very close if the Nano node was connected and synchronized when the user registered his image.


### Blacklists:

To allow control of the content hosted by the Replicators, a self-moderation system based on blacklist is available here.

If you want to ignore / remove certain accounts or content from your Replicator node you can edit the blacklist.json file

No image registers containing any of the blacklist data will be passed through the API.

- accounts: Nano accounts you want to remove
- blocks: transaction blocks you want to remove

When removing only one account or block, if the image of such register is shared by other accounts / blocks, the account / block will be ignored, but the image will not be deleted, only if all accounts using that image are listed in the blacklist.
If an account is the only one that registered such an image, the image will be deleted.

hashes: IPFS hashes of the images you want to remove

The image will be deleted from your IPFS node and will not be saved again, regardless of how many accounts / blocks registered it.


After editing the blacklist, you must restart your Replicator node to delete the images already recorded.

Soon a P2P mechanism will be made available to delegate moderation of records to other participants, voluntarily.
