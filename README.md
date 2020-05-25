<p align="center">
  <img src="https://ipfs.io/ipfs/QmfYxbzSTKknpcT9TSTMdD9jSucUX9cpEdPufT1CdnBEPq" />
</p>

We are much more than public keys!
Nano Profile is a descentralized protocol that facilitates the Nano users experience, allowing them to add profile pictures to their Nano account and identify their friends' account by the picture in a simple and friendly way.

And all of this in a safe and decentralized mechanism.
Using Nano + the P2P network IPFS !

## Web Demo: 
#### http://nanoprofile.online#demo
<img src="https://miro.medium.com/max/1280/1*Rq3CF_lroG8y39nQRzdA8Q.png">

## Client JS

Integrate now into your wallet, website or other app with the NanoProfile client!

### Client side

To obtain images from other Nano accounts, you can use the client:

https://github.com/anarkrypto/NanoProfile/client_js

Support for:
- Browsers (JavaScript)
- NodeJS

This option is P2P, so you are going to need access to a Nano node and an IPFS Gateway. It is not necessary to install an IPFS node or the Replicator node.
The web demo uses this client, for example.

### Server-side:
If you want to try it out using our server API, we provide you the access to it: api.nanoprofile.online

Example of requesting a profile image for a specific Nano account:

```bash 
curl -s — header “Content-Type: application/json” — request POST — data ‘{“account”: “nano_35g1u9tcf93khx1hjdsdgo1i6eu4bty6fsc8zifo7yfn368i9nweg3zfbz5p”}’ http://api.nanoprofile.online
```

Response:
```json
{"account":"nano_35g1u9tcf93khx1hjdsdgo1i6eu4bty6fsc8zifo7yfn368i9nweg3zfbz5p", "blockRegister":"709BE02EA0C4111B985A51FAA4F4D4D758AFCA6F8F0FF2972EAAC8CF6F420DB3", "imageHash":"QmaBvRuuYgX5nsJfKvLuJo3eDDTJUhuiUCwE7kT5gsbCgY", "imageLink":"https://ipfs.io/ipfs/QmaBvRuuYgX5nsJfKvLuJo3eDDTJUhuiUCwE7kT5gsbCgY", "imageSize":57589, "localTimestamp":"1589995691", "successful":true}
```



## Replicator Node
<img src="https://miro.medium.com/max/1104/1*-mn4n0vexCJKLWxJthxzMA.jpeg" />

With the Replicator Node individuals can voluntarily help to store and distribute profile images of Nano users on the network.

Be a Replicator and help us making the Nano Profile network more decentralized!

https://github.com/anarkrypto/NanoProfile/tree/master/replicator_api


## Read More:

Read More on Medium: https://bit.ly/nanoprofile


 <p align="center">    
    <br><br>
   Donate Nano to this project: 
    <br>
   <img src="https://ipfs.io/ipfs/QmNPPmsMvieRrpimUWLDtw7N8ouydnbjchh718iWYN3uqb" />
   <br>
   nano_35g1u9tcf93khx1hjdsdgo1i6eu4bty6fsc8zifo7yfn368i9nweg3zfbz5p
 </p>

