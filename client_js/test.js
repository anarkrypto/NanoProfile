//example for nodeJS

const nanoProfile = require('./NanoProfile_client.js')

function callbackSync (register) {
  if ("foundRegister" in register) {
    console.log ("Found register " + register.foundRegister)
  }
  if ("currentRegister" in register) {
    console.log ("Current register " + register.account + " = " + register.imageHash)
  }
}

async function main () {
  await nanoProfile.importConfigFromFile("./config.json")
  console.log (nanoProfile.CONFIG)
  const sync = await nanoProfile.synchronize(10, callbackSync)
  console.log ("Synchronized: " + JSON.stringify(sync))
  const image = await nanoProfile.getAccountImage("nano_35g1u9tcf93khx1hjdsdgo1i6eu4bty6fsc8zifo7yfn368i9nweg3zfbz5p")
  console.log (image)
}

main()
