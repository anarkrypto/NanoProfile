function qrCodeCreate (address, amount, el){
  const typeNumber = 6;
  const errorCorrectionLevel = 'L';
  let qr = qrcode(typeNumber, errorCorrectionLevel);
  if (!amount || isNaN(amount)) {
    qr.addData("nano:" + address);
  } else {
    qr.addData("nano:" + address + '?amount=' + amount);
  }
  qr.make();
  document.querySelector(el).innerHTML = qr.createImgTag();
}

function timeConverter(UNIX_timestamp){
  const a = new Date(UNIX_timestamp * 1000);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const year = a.getFullYear();
  const month = months[a.getMonth()];
  const date = a.getDate();
  const hour = a.getHours();
  const min = a.getMinutes();
  const sec = a.getSeconds();
  const time = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec ;
  return time;
}

function sleep (time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

function hexEncode(str){
    let hex, i;
    let result = "";
    for (i=0; i<str.length; i++) {
        hex = str.charCodeAt(i).toString(16);
        result += ("000"+hex).slice(-4);
    }
    return result.toUpperCase()
}

function handleFiles(files){
    const file = files[0]
    showModal('terms')
    document.querySelector(".terms button#accept").onclick = async function () {
      hideModal('terms')
      console.log ("Adding " + file.name)
      let image_id = 'image_' + hexEncode(file.name)
      $(".uploadImage .yourProfilePicture img").attr("id", image_id)
      $(".uploadImage .yourProfilePicture img").attr("class", "pending")
      $(".uploadImage .yourProfilePicture img").attr("src", "/img/loading.gif")
      let uploadImage = await addProfileImage(file)
      if (!uploadImage) {
        $(".uploadImage .yourProfilePicture img").attr("id", "default_image")
        $(".uploadImage .yourProfilePicture img").attr("class", "")
        $(".uploadImage .yourProfilePicture img").attr("src", "/img/user.png")
        $('input#fileElem').val('')
        $('.hash .ipfsHash').text("")
        $('.hash .nanoAccount').text("")
        $('.hash').hide()
        $('.sendTransaction').hide()
        $('.showRegisters').show()
      }
    }
    document.querySelector(".terms button#decline").onclick = async function () {
      hideModal('terms')
      alert("declined")
    }
}

async function imageSlider() {
  const directory = "img/"
  const images = {"NanoProfile_logo.png": {width: 300, height: 240 }, "nanoprofile1.png": {width: 200, height: 400 }, "nanoprofile2.png": {width: 200, height: 400 }}
  while (true) {
    for (image in images) {
      $('.sliderPreview img').fadeOut(500)
      await sleep (400)
      $('.sliderPreview img').css("width", images[image].width + "px")
      $('.sliderPreview img').css("height", images[image].height + "px")
      $('.sliderPreview img').attr("src", directory + image)
      $('.sliderPreview img').fadeIn(500)
      await sleep(8000)
    }
  }
}

function checkImageNameExtension(imageName) {
  const extension = imageName.split('.')[imageName.split('.').length - 1]
  const validExtensions = CONFIG.imageFormats
  if (validExtensions.includes(extension.toUpperCase())) {
    return extension
  } else {
    return false
  }
}

function getMimetype (signature) {
    switch (signature) {
        case '89504E47':
            return 'image/png'
        case '47494638':
            return 'image/gif'
        case '25504446':
        case 'FFD8FFDB':
        case 'FFD8FFE0':
        case 'ffd8ffe0':
        case 'ffd8ffe1':
        case 'ffd8ffe2':
            return 'image/jpeg'
        default:
            return 'unknown'
    }
}

function fadeAll () {
  if ($(".modalLayer").css("display") == "none" ) {
    const body = document.body, html = document.documentElement;
    const height = Math.max( body.scrollHeight, body.offsetHeight,
                         html.clientHeight, html.scrollHeight, html.offsetHeight );
    $(".modalLayer").css("height", height)
    $(".modalLayer").fadeIn("slow")
  } else {
    $(".modalLayer").fadeOut("slow")
  }

}

function showImageRegister(register) {
    fadeAll()
    let imageLink = ""
    const account = registers[register].account
    $(".showRegister").fadeIn("slow")
    $(".showRegister span.account").text(registers[register].account)
    $(".showRegister span.block").text(register)
    $(".showRegister span.imageHash").text(registers[register].imageHash)
    if (account in currentRegisters) {
      imageLink = currentRegisters[account].imageLink
    } else {
      imageLink = CONFIG.ipfs.gateway + "/ipfs/" + registers[register].imageHash
    }
    $(".showRegister .profilePicture img").attr("src", imageLink)
}

function showModal(modalClass) {
  fadeAll()
  $(".modal."+modalClass).fadeIn("slow")
}

function hideModal(modalClass) {
  fadeAll()
  $(".modal."+modalClass).fadeOut("slow")
}

async function showRegisteredImages(register) {
    $(".showRegisters .right").removeClass("selected")
    $(".showRegisters .left").addClass("selected")
    $(".showRegisters .findImageAccount").hide()
    $(".showRegisters .listRegisters").show()
}

async function hideImageRegister () {
  fadeAll()
  $(".showRegister").fadeOut("slow")
  await sleep (700)
  $(".showRegister span.account").text("")
  $(".showRegister span.block").text("")
  $(".showRegister span.imageHash").text("")
  $(".showRegister .profilePicture img").attr("src", "img/loading2.gif")
}

async function showFindAccount(register) {
    $(".showRegisters .left").removeClass("selected")
    $(".showRegisters .right").addClass("selected")
    $(".showRegisters .listRegisters").hide()
    $(".showRegisters .findImageAccount").show()
}

function readFileAsync(file) {
  return new Promise((resolve, reject) => {
    let reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  })
}

function copyToClipboard (str) {
  $('body').append('<input type="text" value="' + str + '" id="tempInput">')
  let copyText = document.getElementById("tempInput");
  copyText.select();
  copyText.setSelectionRange(0, 99999)
  document.execCommand("copy");
  $('#tempInput').remove()
  console.log("Copied the text: " + copyText.value);
}

async function uploadToIPFS(file) {
    const arrayBuffer = await readFileAsync(file);
    const data = await ipfsRequest (file.name, buffer.Buffer(arrayBuffer)).then(response => response);
    console.log(JSON.stringify(data[0], null, 2))
    return data[0]
}

async function getAccountImage () {
  const account = $(".findImageAccount .putAccount").val()
  const accountImageInfo = await nanoProfile.getAccountImage(account)
  let html = ""
  if ("successfull" in accountImageInfo) {
    html = '<strong>successfull: </strong><br><img class="accountImage" src="' + accountImageInfo.imageLink + '" />'
  }
  if ("error" in accountImageInfo) {
    html = '<strong>Error: </strong>' + accountImageInfo.error
  }
  if ("fail" in accountImageInfo) {
    html = '<strong>Fail: </strong>' + accountImageInfo.fail
  }
  $(".findImageAccount .result").html(html)
}

async function addProfileImage (file){
  try {
    const image_id = "image_" + hexEncode(file.name)
    await sleep(100)
    if (file.size > CONFIG.imageMaxSize) {
      alert ("This file is too big")
      return false
    }
    let arrayBuffer = await readFileAsync(file);
    let arrayBufferView = new Uint8Array(arrayBuffer);
    let imageFormat = checkImageNameExtension(file.name)
    if (!imageFormat){
      let bytes = []
      arrayBufferView.forEach((byte) => {
        bytes.push(byte.toString(16))
      })
      const hex = bytes.join('').toUpperCase()
      const magicNumber = hex.substr(0, 8)
      imageFormat = getMimetype(magicNumber)
      if ( imageFormat == 'unknown') {
        alert ("Invalid Image File. Please choose another image! Supported images: " + CONFIG.imageFormats.join(', '))
        return false
      }
    }
    const blob = new Blob( [ arrayBufferView ], { type: "image/"+imageFormat } );
    const urlCreator = window.URL || window.webkitURL;
    const imageUrl = urlCreator.createObjectURL( blob );
    console.log (imageUrl)
    $('img#'+image_id).attr('src', imageUrl);

    let jsonUpload = await uploadToIPFS(file)
    if ("hash" in jsonUpload) {
      if (!nanoProfile.checkIpfsHash(jsonUpload["hash"])) {
        alert ("Error in IPFS upload response")
        return false
      }

      let imageHash = jsonUpload["hash"]
      let imgName = jsonUpload["path"]

      const registerInfo = nanoProfile.registerImage(imageHash)
      $('#'+image_id + ' img').attr('src', registerInfo.imageLink);
      $('#'+image_id).removeClass('pending')
      $('.hash').show()
      $('.uploadImage .ipfsHash').text(imageHash)
      $('.uploadImage .nanoAccount').text(registerInfo.representative)

      $('.analyzing').show()
      while (synchronized !== true) await sleep (1000)
      $('.analyzing').hide()

      qrCodeCreate(registerInfo.representative, false, '.changeRepresentative .qr')
      qrCodeCreate(registerInfo.destination, registerInfo.amount, '.sendTransaction .qr')

      $('.showRegisters').hide()
      $('.changeRepresentative .account').text(registerInfo.representative)
      $('.sendTransaction .account').text(registerInfo.destination)

      $('.changeRepresentative').fadeIn("slow")

      $(".sendTransaction span.amount").text(toMegaNano(registerInfo.amount))
      $(".sendTransaction span.destination").text(registerInfo.destination)
      $(".sendTransaction a.uri").attr("href", "nano:" + registerInfo.destination + "?amount=" + registerInfo.amount)

      let newTransaction = await awaitNewRegister(imageHash)
      if ("foundRegister" in newTransaction) {
         showImageRegister (newTransaction.foundRegister)
      } else {
        alert ("None transaction found")
      }
    } else {
      alert ("Error uploading")
    }
  } catch (err) {
    console.log(err);
  }
}

async function awaitNewRegister(imageHash) {
  const oldRegisters = {...registers}
  let register = {}
  for (let i=0; i<=600; i++) {
    for (let registerBlock in registers){
      register = registers[registerBlock]
      if (!(registerBlock in oldRegisters) && register.imageHash == imageHash) return register
    }
    await sleep(1000)
  }
}

async function loadImagesRegisters (register) {
    if ("foundRegister" in register) {
      console.log ("Found register: " + register.foundRegister)
      registers[register.foundRegister] = register
      $('.registersInfo .found').text(Object.keys(registers).length)
    }
    if ("currentRegister" in register) {
      console.log (register.account + " current register: " + register.imageHash)
      if (register.account in currentRegisters && currentRegisters[register.account].imageHash == register.imageHash){
        $('.showRegisters .listRegisters').find(`[data-account='${register.account}']`).remove()
      }
      currentRegisters[register.account] = register
      console.log (register)
      $('.registersInfo .current').text(Object.keys(currentRegisters).length)
      registerHTML = '<div class="imageRegister" \
                        data-account="' + register.account + '" \
                        data-block="' + register.currentRegister + '" \
                        data-image="' + register.imageHash + '" \
                        onclick="showImageRegister(\''+ register.currentRegister +'\')" > \
                        <div class="imageProfile"> \
                          <img src="' + register.imageLink + '" /> \
                        </div> \
                        <div class="info">' + register.account + ' \
                          <br>Node Timestamp: ' + timeConverter(register.local_timestamp) + ' \
                        </div> \
                      </div>'
      $('.showRegisters .listRegisters').prepend(registerHTML)
    }
}

function toMegaNano (raws){
  if (raws == 0) return 0
  let megaNano
  if ( (raws.toString().length - 30) > 0) {
   megaNano = raws.toString().substr(0, raws.toString().length - 30) + '.' + raws.toString().substr(raws.toString().length - 30, raws.toString().length - (raws.toString().length - 30))
  } else {
   megaNano = "0." + "0".repeat(30 - raws.toString().length) + raws
  }
  while (megaNano[megaNano.length - 1] == '0') megaNano = megaNano.substr(0, megaNano.length - 1)
  return megaNano
}

function bytesToSize(bytes) {
   const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
   if (bytes == 0) return '0 Byte';
   const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1000)));
   return Math.round(bytes / Math.pow(1000, i), 2) + ' ' + sizes[i];
}

function updatePageInfo() {
  $('span.maxSize').text(bytesToSize(CONFIG.imageMaxSize))
  $('span.acceptedFormats').text(CONFIG.imageFormats.join(', '))
}

async function showSendTransaction(){
  $(".changeRepresentative").hide()
  $(".sendTransaction").fadeIn("slow")
}

async function importJSON (file) {
  try {
    const json = await fetch(file, {
      mode: 'no-cors',
    }).then(response => response.json());
    return json
  } catch (err) {
    throw new Error (err)
  }
}

async function main () {
  CONFIG = await importJSON("config.json")
  updatePageInfo()
  await nanoProfile.importConfigFromFile("NanoProfile_client.js/config.json")
  await nanoProfile.importBlacklistFromFile("blacklist.json")
  const sync = await nanoProfile.synchronize(CONFIG.synchronizeDelay, loadImagesRegisters)
  if ("successfull" in sync) {
    synchronized = true

    $(".listRegisters img.loading").css("display", "none")
    $( "#fileElem" ).prop("disabled", false )
    document.getElementById('get_file').onclick = function() {
        document.getElementById('fileElem').click();
    }
  } else {
    alert ("Error synchronizing: " + sync.fail)
  }
}


let CONFIG = []
let synchronized = false
let registers = {}
let currentRegisters = {}
imageSlider()
main()
