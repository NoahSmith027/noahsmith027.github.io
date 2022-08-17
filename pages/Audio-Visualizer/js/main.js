var app = app || {}

app.main = (function () {
    "use strict";
    let ctx;
    let canvasWidth;
    let canvasHeight;

    let counter = 0;
    let day = true; // bool if day (true) or night (false)

    const SOUND_PATH = Object.freeze({
        sound1: "media/Subnautica-AbandonShip.mp3",
        sound2: "media/KingdomHearts3-DearlyBeloved.mp3",
        sound3: "media/Celeste-FirstSteps.mp3"
    });

    let playing = false;

    // 2 - elements on the page
    let audioElement, canvasElement;

    // UI
    let playButton;
    let dayButton;

    // 4 - our WebAudio context
    let audioCtx;

    // 5 - nodes that are part of our WebAudio audio routing graph
    let sourceNode, analyserNode, gainNode;

    // 6 - a typed array to hold the audio frequency data
    const NUM_SAMPLES = 256;
    // create a new array of 8-bit integers (0-255)
    let audioData = new Uint8Array(NUM_SAMPLES / 2);

    let trackSelected;
    let songTime = document.getElementById("songTime");
    let songDuration = document.getElementById("songDuration");

    let biquadFilter;
    let lowShelfBiquadFilter;
    let highshelf, lowshelf = false;
    let trebleValue = 0;
    let bassValue = 0;

    let endX = 0;
    let endY = 0;

    // FUNCTIONS
    function init() {
        setupWebaudio();
        setupCanvas();
        setupUI();
        update();
    }

    function setupWebaudio() {
        // 1 - The || is because WebAudio has not been standardized across browsers yet
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();

        // 2 - get a reference to the <audio> element on the page
        audioElement = document.querySelector("audio");
        audioElement.src = SOUND_PATH.sound3;

        // 3 - create an a source node that points at the <audio> element
        sourceNode = audioCtx.createMediaElementSource(audioElement);

        // 4 - create an analyser node
        analyserNode = audioCtx.createAnalyser();

        /*
        We will request NUM_SAMPLES number of samples or "bins" spaced equally 
        across the sound spectrum.
    	
        If NUM_SAMPLES (fftSize) is 256, then the first bin is 0 Hz, the second is 172 Hz, 
        the third is 344Hz. Each bin contains a number between 0-255 representing 
        the amplitude of that frequency.
        */

        // fft stands for Fast Fourier Transform
        analyserNode.fftSize = NUM_SAMPLES;

        biquadFilter = audioCtx.createBiquadFilter();
        biquadFilter.type = "highshelf";

        lowShelfBiquadFilter = audioCtx.createBiquadFilter();
        lowShelfBiquadFilter.type = "lowshelf";

        // 5 - create a gain (volume) node
        gainNode = audioCtx.createGain();
        gainNode.gain.value = 1;

        // 6 - connect the nodes - we now have an audio graph
        sourceNode.connect(biquadFilter);
        biquadFilter.connect(lowShelfBiquadFilter);
        lowShelfBiquadFilter.connect(analyserNode);
        analyserNode.connect(gainNode);
        gainNode.connect(audioCtx.destination);
    }

    function setupCanvas() {
        canvasElement = document.querySelector('canvas');
        ctx = canvasElement.getContext("2d");
    }

    function setupUI() {
        playButton = document.querySelector("#playButton");
        playButton.onclick = e => {
            //console.log(`audioCtx.state = ${audioCtx.state}`);

            // check if context is in suspended state (autoplay policy)
            if (audioCtx.state == "suspended") {
                audioCtx.resume();
            }

            if (e.target.dataset.playing == "no") {
                audioElement.play();
                e.target.dataset.playing = "yes";
                playing = true;
                // if track is playing pause it
            } else if (e.target.dataset.playing == "yes") {
                audioElement.pause();
                e.target.dataset.playing = "no";
                playing = false;
            }

        };

        document.querySelector("#trackSelect").onchange = e => {
            audioElement.src = e.target.value;
            // pause the current track if it is playing
            playButton.dispatchEvent(new MouseEvent("click"));
        };

        dayButton = document.querySelector("#dayButton");
        dayButton.onclick = e => {
            if (day) { day = false; }
            else { day = true }
        };

        document.querySelector("#fsButton").onclick = e => {
            requestFullscreen(canvasElement);
        };

        let volumeSlider = document.querySelector("#volumeSlider");
        volumeSlider.oninput = e => {
            gainNode.gain.value = e.target.value * 0.1;
            //volumeLabel.innerHTML = Math.round((e.target.value / 2 * 100));
        };
        volumeSlider.dispatchEvent(new InputEvent("input"));

        document.querySelector("#trebleSlider").value = trebleValue;
        document.querySelector("#trebleSlider").onchange = e => {
            trebleValue = e.target.value;
            toggleLowshelf();
        }

        document.querySelector("#bassSlider").value = bassValue;
        document.querySelector("#bassSlider").onchange = e => {
            bassValue = e.target.value;
            toggleHighshelf();
        }
    }

    function requestFullscreen(element) {
        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.mozRequestFullscreen) {
            element.mozRequestFullscreen();
        } else if (element.mozRequestFullScreen) { // camel-cased 'S' was changed to 's' in spec
            element.mozRequestFullScreen();
        } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen();
        }
        // .. and do nothing if the method is not supported

    };

    function updateSongTime() {
        songTime = document.querySelector("audio").currentTime;
        songDuration = document.querySelector("audio").duration;

        songTime = Math.floor(songTime);
        songDuration = Math.floor(songDuration);

        document.getElementById("songTime").innerHTML = songTime;
        document.getElementById("songDuration").innerHTML = songDuration;
    };

    function toggleHighshelf() {
        if (highshelf) {
            biquadFilter.frequency.setValueAtTime(1000, audioCtx.currentTime);
            biquadFilter.gain.setValueAtTime(25, audioCtx.currentTime);
        } else {
            biquadFilter.gain.setValueAtTime(0, audioCtx.currentTime);
        }
    }

    function toggleLowshelf() {
        if (lowshelf) {
            lowShelfBiquadFilter.frequency.setValueAtTime(1000, audioCtx.currentTime);
            lowShelfBiquadFilter.gain.setValueAtTime(15, audioCtx.currentTime);
        } else {
            lowShelfBiquadFilter.gain.setValueAtTime(0, audioCtx.currentTime);
        }
    }

    function manipulatePixels(ctx) {
        // 28 - get all the rgba pixel data of the canvas by grabbing the ImageData Object
        let imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);

        // 29
        let data = imageData.data;
        let length = data.length;
        let width = imageData.width;

        // 30 - iterate through each pixel
        let i;
        for (i = 0; i < length; i += 4) {
            // invert every color channel
            if (document.getElementById("invertCheck").checked == true) {
                let red = data[i], green = data[i + 1], blue = data[i + 2];
                data[i] = 255 - red;
                data[i + 1] = 255 - green;
                data[i + 2] = 255 - blue;
                // data[i+3] is alpha
            }
            // noise
            if (document.getElementById("noiseCheck").checked == true && Math.random() < .10) {
                data[i] = data[i + 1] = data[i + 2] = 128; // gray noise
                //data[i] = data[i+1] = data[i+2] = 128; // white noise
                //data[i] = data[i+1] = data[i+2] = 128; // black noise
                data[i + 3] = 255; // alpha
            }
            // sepia
            if (document.getElementById("sepiaCheck").checked == true) {
                let red = data[i], green = data[i + 1], blue = data[i + 2];
                data[i] = (red * .393) + (green * .769) + (blue * .189);
                data[i + 1] = (red * .349) + (green * .686) + (blue * .168);
                data[i + 2] = (red * .272) + (green * .523) + (blue * .131);
            }

            // increase the red value only
            if (document.getElementById("tintRedCheck").checked == true) {
                data[i] = data[i] + 100;
            }
            // increase the blue value only
            if (document.getElementById("tintBlueCheck").checked == true) {
                data[i + 1] = data[i + 1] + 100;
            }
            // increase the green value only
            if (document.getElementById("tintGreenCheck").checked == true) {
                data[i + 2] = data[i + 2] + 100;
            }
        }

        // 31 - put modified data back on the canvas
        ctx.putImageData(imageData, 0, 0);
    }

    function update() {
        // this schedules a call to the update() method in 1/60 seconds
        requestAnimationFrame(update);

        if (document.getElementById("lockDaySwitch").checked == true) {
            if (playing) {
                if (counter >= 1200) {
                    counter = 0;
                    if (day) { day = false; }
                    else { day = true }
                }
                counter += 1;
            }
        }

        updateSongTime();


        /*
            Nyquist Theorem
            http://whatis.techtarget.com/definition/Nyquist-Theorem
            The array of data we get back is 1/2 the size of the sample rate 
        */

        // populate the audioData with the frequency data
        // notice these arrays are passed "by reference" 
        analyserNode.getByteFrequencyData(audioData);

        // OR
        //analyserNode.getByteTimeDomainData(audioData); // waveform data

        // DRAW!
        ctx.clearRect(0, 0, 1280, 720);

        /* let r = 0;
        let g = 0;
        let b = 0; */

        // screen size is 1280x720, half=640x360

        // Sky
        let grad = ctx.createLinearGradient(0, 0, 0, 400);
        if (day) {
            grad.addColorStop(0, "white");
            grad.addColorStop(1, "rgb(26,209,232)");
        }
        else if (!day) {
            grad.addColorStop(0, "rgb(41,2,2)");
            grad.addColorStop(1, "rgb(11,35,255");
        }
        ctx.fillStyle = grad;
        //ctx.fillRect(0, 0, 640, 160);
        ctx.fillRect(0, 0, 1280, 400);

        // Sun
        if (day) {
            ctx.fillStyle = "rgb(255,161,39)";
        }
        else if (!day) {
            ctx.fillStyle = "rgb(230, 230, 230)";
        }
        ctx.beginPath();
        //ctx.arc(200, 120, 100, 0, Math.PI * 2, false);
        ctx.arc(400, 250, 200, 0, Math.PI * 2, false);
        ctx.fill();

        if (day) {
            // Bird
            ctx.strokeStyle = "rgb(0,0,0)";
            ctx.beginPath();
            /* ctx.moveTo(500, 100);
            ctx.quadraticCurveTo(500, 60, 460, 100); */
            ctx.moveTo(900, 300);
            ctx.quadraticCurveTo(900, 260, 860, 300);
            ctx.stroke();
            ctx.beginPath();
            /* ctx.moveTo(500, 100);
            ctx.quadraticCurveTo(500, 60, 540, 100); */
            ctx.moveTo(900, 300);
            ctx.quadraticCurveTo(900, 260, 940, 300);
            ctx.stroke();

            // Bird
            ctx.strokeStyle = "rgb(0,0,0)";
            ctx.beginPath();
            /* ctx.moveTo(425, 75);
            ctx.quadraticCurveTo(425, 35, 400, 75); */
            ctx.moveTo(825, 250);
            ctx.quadraticCurveTo(825, 210, 800, 250);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(825, 250);
            ctx.quadraticCurveTo(825, 210, 850, 250);
            ctx.stroke();
        }

        for (let i = 0; i < 360; i++) {
            // sun radial bar graph
            if (day) {
                ctx.fillStyle = "rgb(255,161,39)";
                let w = 255 - (256 - audioData[i])
                ctx.save();
                ctx.translate(400, 250);
                ctx.rotate((4 * i + 90) * Math.PI / 180);
                ctx.fillRect(200, 0, w / 2, 10);
                ctx.restore();
            }
        }

        for (let i = 0; i < audioData.length; i++) {
            if (day) {
                // Sun circle graph
                let percent = audioData[i] / 255;
                let maxRadius = 200;
                let circleRadius = percent * maxRadius;
                // outer
                ctx.beginPath();
                ctx.fillStyle = "rgba(255,218,17,0.6)";
                //ctx.arc(200, 120, circleRadius, 0, 2 * Math.PI, false);
                ctx.arc(400, 250, circleRadius, 0, 2 * Math.PI, false);
                ctx.fill();
                ctx.closePath();
                // middle
                ctx.beginPath();
                ctx.fillStyle = "rgba(255,139,50,0.6)";
                //ctx.arc(200, 120, circleRadius * 0.9, 0, 2 * Math.PI, false);
                ctx.arc(400, 250, circleRadius * 0.9, 0, 2 * Math.PI, false);
                ctx.fill();
                ctx.closePath();
                //inner
                ctx.beginPath();
                ctx.fillStyle = "rgba(255,99,43,0.6)";
                //ctx.arc(200, 120, circleRadius * 0.75, 0, 2 * Math.PI, false);
                ctx.arc(400, 250, circleRadius * 0.75, 0, 2 * Math.PI, false);
                ctx.fill();
                ctx.closePath();
            }

            // stars
            if (!day) {
                endX = 700;
                endY = 200;
                let radialGrad = ctx.createRadialGradient(endX, endY, 5, endX, endY, 30);
                radialGrad.addColorStop(0, "rgba(255,254,135,0.4)");
                radialGrad.addColorStop(1, "rgba(255,254,210,0.4)");
                ctx.fillStyle = radialGrad;
                ctx.beginPath();
                ctx.arc(endX, endY, 0.15 * audioData[i], 0, 2 * Math.PI);
                ctx.fill();

                endX = 900;
                endY = 50;
                radialGrad = ctx.createRadialGradient(endX, endY, 5, endX, endY, 30);
                radialGrad.addColorStop(0, "rgba(255,254,135,0.4)");
                radialGrad.addColorStop(1, "rgba(255,254,210,0.4)");
                ctx.fillStyle = radialGrad;
                ctx.beginPath();
                ctx.arc(endX, endY, 0.15 * audioData[i], 0, 2 * Math.PI);
                ctx.fill();

                endX = 1100;
                endY = 300;
                radialGrad = ctx.createRadialGradient(endX, endY, 5, endX, endY, 30);
                radialGrad.addColorStop(0, "rgba(255,254,135,0.4)");
                radialGrad.addColorStop(1, "rgba(255,254,210,0.4)");
                ctx.fillStyle = radialGrad;
                ctx.beginPath();
                ctx.arc(endX, endY, 0.15 * audioData[i], 0, 2 * Math.PI);
                ctx.fill();

                // curve design on moon
                ctx.strokeStyle = "white";
                //ctx.lineWidth = 5;
                ctx.beginPath();
                ctx.moveTo(400, 450); // bottom of moon
                ctx.bezierCurveTo(300 - (0.5 * audioData[i]), 300, 300 - (0.5 * audioData[i]), 200, 400, 50);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(400, 450); // bottom of moon
                ctx.bezierCurveTo(300 + (0.5 * audioData[i]), 300, 300 + (0.5 * audioData[i]), 200, 400, 50);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(400, 450); // bottom of moon
                ctx.bezierCurveTo(500 - (0.5 * audioData[i]), 300, 500 - (0.5 * audioData[i]), 200, 400, 50);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(400, 450); // bottom of moon
                ctx.bezierCurveTo(500 + (0.5 * audioData[i]), 300, 500 + (0.5 * audioData[i]), 200, 400, 50);
                ctx.stroke();
            }

        }

        // Horizon Line
        ctx.strokeStyle = "black";
        /* ctx.moveTo(0, 160);
        ctx.lineTo(640, 160); */
        ctx.moveTo(0, 400);
        ctx.lineTo(1280, 400);
        ctx.stroke();

        // Ocean
        /* grad = ctx.createLinearGradient(0, 160, 0, 360); */
        grad = ctx.createLinearGradient(0, 400, 0, 720);
        if (day) {
            grad.addColorStop(0, "rgb(41,153,255)");
            grad.addColorStop(1 / 4, "rgb(155,199,255)");
            grad.addColorStop(2 / 4, "rgb(41,153,255)");
            grad.addColorStop(3 / 4, "rgb(41,153,255)");
            grad.addColorStop(1, "rgb(41,153,255)");
        }
        else if (!day) {
            grad.addColorStop(0, "rgb(200, 200, 200)");
            grad.addColorStop(1 / 4, "rgb(20, 8, 200)");
            grad.addColorStop(2 / 4, "rgb(20, 8, 200)");
            grad.addColorStop(3 / 4, "rgb(20, 8, 200)");
            grad.addColorStop(1, "rgb(20, 8, 200)");
        }
        ctx.fillStyle = grad;
        /* ctx.fillRect(0, 160, 640, 200); */
        ctx.fillRect(0, 400, 1280, 320);

        // loop through the data and draw!
        for (let i = 0; i < audioData.length; i++) {

            // the higher the amplitude of the sample (bin) the taller the bar
            // remember we have to draw our bars left-to-right and top-down
            //drawCtx.fillRect(i * (barWidth + barSpacing),topSpacing + 256-audioData[i],barWidth,barHeight); 

            // sun glare visualizer
            if (day) {
                ctx.fillStyle = "rgba(255,161,39,0.4)";
            }
            else if (!day) {
                ctx.fillStyle = "rgba(225,225,225,0.2)";
            }
            // sun is centered at 400,250
            let w = 200 - (256 - audioData[i]);
            if (w < 50) { w = 50; }
            if (w > 300) { w = 300; }
            ctx.fillRect(400, 400 + (i * 10), w, 10);
            ctx.fillRect(400, 400 + (i * 10), -w, 10);

        }

        if (document.getElementById("invertCheck").checked == true || document.getElementById("noiseCheck").checked == true ||
            document.getElementById("sepiaCheck").checked == true || document.getElementById("tintRedCheck").checked == true ||
            document.getElementById("tintBlueCheck").checked == true || document.getElementById("tintGreenCheck").checked == true) {
            manipulatePixels(ctx);
        }


    }

    return {
        init
    }
})();