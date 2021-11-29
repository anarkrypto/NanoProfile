function ipfsRequest (file_name, data) {
  var ipfs = window.IpfsHttpClient(CONFIG.ipfs.node, {protocol: CONFIG.ipfs.protocol}) //router to the IPFS network without any local node
  var file_send =
  [
   {
     path: file_name,
     content: data
   }
 ]
  return new Promise((resolve, reject) => {
      ipfs.add(file_send, function (err, json) {
        if (err) {
          alert(err);
          reject (0)
        } else {
          resolve (json)
        }
      })
  })
}
