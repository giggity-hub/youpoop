function randomIntBetween(min, max){
    return parseInt(Math.random() * (max - min) + min);
}

function randomFloatBetween(min, max){
    return Math.random() * (max - min) + min;
}

let runtime = null;

if (typeof chrome != 'undefined') {
    runtime = chrome.runtime
}else if(typeof browser != 'undefined'){
    runtime = browser
}else{
    throw Error('Could not find a runtime')
}

class YouPoop{
    isPooping = false;
    audioController = null;
    svgController = null;

    constructor(audioController, svgController){
        this.audioController = audioController;
        this.svgController = svgController;
    }

    start(){
        this.isPooping = true;
        this.poop()
        this.svgController.show()
    }

    stop(){
        this.isPooping = false;
        this.svgController.hide()
        this.audioController.stopAll()
    }

    pause(){
        this.isPooping = false;
        this.audioController.stopAll()
    }

    poop(){
        if (! this.isPooping){
            return
        }
        const audio = this.audioController.randomFart()
        audio.onloadedmetadata = () => {
            audio.play()
            this.svgController.animateFart(audio.duration)
        }

        const timeout = randomFloatBetween(300, 800)
        window.setTimeout(this.poop.bind(this), timeout)
    }
}

class AudioController{
    numberOfAudioFiles = 5
    _volume = 0
    volumeBoost = 1.2
    activeAudioPlayers = new Set()

    get volume(){
        return this._volume
    }
    set volume(value){
        this._volume = Math.min(value * this.volumeBoost, 1);
        this.activeAudioPlayers.forEach(audio => {

            audio.volume = this._volume;
        })
    }

    constructor($mainVideo){
        console.log($mainVideo)
        this.volume = $mainVideo.muted ? 0 : $mainVideo.volume
        console.log('initial volume', $mainVideo.muted, $mainVideo.volume)
        $mainVideo.addEventListener('volumechange', (e)=>{
            this.volume = $mainVideo.muted ? 0 : $mainVideo.volume
        })
    }
    randomFart(){
        const index = randomIntBetween(0, this.numberOfAudioFiles)
        const url = runtime.getURL(`/audios/${index}.wav`) 
        const audio = new Audio(url)
        audio.volume = this.volume;
        console.log(this.volume)

        this.activeAudioPlayers.add(audio)
        audio.onended = ()=>{
            this.activeAudioPlayers.delete(audio)
        }
        return audio
    }

    stopAll(){
        this.activeAudioPlayers.forEach(audio=> {
            audio.pause()
        })
        this.activeAudioPlayers.clear()
    }
}



class SvgController{
    $svg = null;

    width = 160;
    height = 90;


    show(){
        this.$svg.style.visibility = 'visible'
    }
    
    hide(){
        this.$svg.style.visibility = 'hidden'
    }
    

    constructor($svgParent){
        this.$svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        this.$svg.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`)
        this.$svg.id = 'youpoop'
        $svgParent.append(this.$svg)
    }

    animateFart(duration){
        const $imageNode = this._createPoopTextNode()
        this.setProperties($imageNode, {
            duration,
            x: randomFloatBetween(0, this.width),
            y: randomFloatBetween(0, this.height),
            width: 10,
            height: 10,
            rotationAmount: randomFloatBetween(360, 720),
            scaleAmount: randomFloatBetween(1.2, 1.6)
        })
        this.$svg.append($imageNode)
    }

    _createPoopTextNode(){
        const imageNode = document.createElementNS('http://www.w3.org/2000/svg', 'image')
        const href = runtime.getURL('./poop.png')
        imageNode.classList.add('poop')
        imageNode.setAttribute('href', href)
        imageNode.addEventListener('animationend', ()=> imageNode.remove())
        return imageNode;
        
    }
    setProperties(imageNode, data){
        imageNode.setAttribute('x', data.x)
        imageNode.setAttribute('y', data.y)
        imageNode.setAttribute('width', data.width)
        imageNode.setAttribute('height', data.height)

        imageNode.style.setProperty('--rotation-amount', data.rotationAmount + 'deg')
        imageNode.style.setProperty('--scale-amount', data.scaleAmount)
        imageNode.style.setProperty('--duration', data.duration + 's');
    }
}



function init($videoPlayer){
    const $mainVideo = $videoPlayer.querySelector('.html5-main-video')
    const svgController = new SvgController($videoPlayer)
    const audioController = new AudioController($mainVideo)
    const youPoop = new YouPoop(audioController, svgController)

    const videoPlayerObserver = new MutationObserver((mutations) => { 
        let adShowing = false;
        let pausedMode = false;
        mutations.forEach((mutation) => {
            adShowing = adShowing || mutation.target.classList.contains('ad-showing');
            pausedMode = pausedMode || mutation.target.classList.contains('paused-mode')
        });
        


        if (adShowing && !youPoop.isPooping && !pausedMode) {
            youPoop.start()
        }else if(!adShowing && youPoop.isPooping){
            youPoop.stop()
        }else if(pausedMode){
            youPoop.pause()
        }
    });

    videoPlayerObserver.observe($videoPlayer, {
        childList: false, 
        characterData: false, 
        attributes: true, 
        attributeFilter: ['class']
    })
}


function waitForVideoPlayer(){
    $videoPlayer = document.querySelector('.html5-video-player')
    if ($videoPlayer) {
        init($videoPlayer)
        document.removeEventListener('yt-navigate-finish', waitForVideoPlayer)
    }
}

document.addEventListener('yt-navigate-finish', waitForVideoPlayer)