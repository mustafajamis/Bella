// 导入 Transformers.js 的 pipeline
import { pipeline } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1';

document.addEventListener('DOMContentLoaded', function() {

    // --- Loading Screen Handling ---
    const loadingScreen = document.getElementById('loading-screen');
    setTimeout(() => {
        loadingScreen.style.opacity = '0';
        // Hide it after animation ends to prevent blocking interactions
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500); // This time should match the transition time in CSS
    }, 1500); // Start fading out after 1.5 seconds
    
    // Get required DOM elements
    let video1 = document.getElementById('video1');
    let video2 = document.getElementById('video2');
    const micButton = document.getElementById('mic-button');
    const floatingButton = document.getElementById('floating-button');
    const menuContainer = document.getElementById('menu-container');
    const menuItems = document.querySelectorAll('.menu-item');

    let activeVideo = video1;
    let inactiveVideo = video2;

    // Video list
    const videoList = [
        '视频资源/3D 建模图片制作.mp4',
        '视频资源/jimeng-2025-07-16-1043-笑着优雅的左右摇晃，过一会儿手扶着下巴，保持微笑.mp4',
        '视频资源/jimeng-2025-07-16-4437-比耶，然后微笑着优雅的左右摇晃.mp4',
        '视频资源/生成加油视频.mp4',
        '视频资源/生成跳舞视频.mp4',
        '视频资源/负面/jimeng-2025-07-16-9418-双手叉腰，嘴巴一直在嘟囔，表情微微生气.mp4'
    ];

    // --- Video Cross-Fade Playback Functionality ---
    function switchVideo() {
        // 1. Select next video
        const currentVideoSrc = activeVideo.querySelector('source').getAttribute('src');
        let nextVideoSrc = currentVideoSrc;
        while (nextVideoSrc === currentVideoSrc) {
            const randomIndex = Math.floor(Math.random() * videoList.length);
            nextVideoSrc = videoList[randomIndex];
        }

        // 2. Set inactive video element source
        inactiveVideo.querySelector('source').setAttribute('src', nextVideoSrc);
        inactiveVideo.load();

        // 3. When inactive video is ready to play, execute switch
        inactiveVideo.addEventListener('canplaythrough', function onCanPlayThrough() {
            // Ensure event only triggers once
            inactiveVideo.removeEventListener('canplaythrough', onCanPlayThrough);

            // 4. Play new video
            inactiveVideo.play().catch(error => {
                console.error("Video play failed:", error);
            });

            // 5. Switch active class to trigger CSS transition
            activeVideo.classList.remove('active');
            inactiveVideo.classList.add('active');

            // 6. Update roles
            [activeVideo, inactiveVideo] = [inactiveVideo, activeVideo];

            // Bind ended event for new activeVideo
            activeVideo.addEventListener('ended', switchVideo, { once: true });
        }, { once: true }); // Use { once: true } to ensure event is only handled once
    }

    // Initial startup
    activeVideo.addEventListener('ended', switchVideo, { once: true });


    // --- Speech Recognition Core ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;

    // Check if browser supports speech recognition
    if (SpeechRecognition) {
        console.log('Browser supports speech recognition');
        recognition = new SpeechRecognition();
        recognition.continuous = true; // Continuous recognition
        recognition.lang = 'en-US'; // Set language to English
        recognition.interimResults = true; // Get interim results

        recognition.onstart = () => {
            console.log('Speech recognition started');
            const transcriptContainer = document.getElementById('transcript');
            transcriptContainer.textContent = 'Listening...';
        };

        recognition.onresult = (event) => {
            console.log('Speech recognition result received');
            const transcriptContainer = document.getElementById('transcript');
            let final_transcript = '';
            let interim_transcript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    final_transcript += event.results[i][0].transcript;
                } else {
                    interim_transcript += event.results[i][0].transcript;
                }
            }
            
            // Display final recognition result
            transcriptContainer.textContent = final_transcript || interim_transcript;
            
            // Keyword-based sentiment analysis and video switching
            if (final_transcript) {
                analyzeAndReact(final_transcript);
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            const transcriptContainer = document.getElementById('transcript');
            transcriptContainer.textContent = `Error: ${event.error}`;
        };

        recognition.onend = () => {
            console.log('Speech recognition ended');
        };

    } else {
        console.log('Your browser does not support speech recognition.');
        const transcriptContainer = document.getElementById('transcript');
        transcriptContainer.textContent = 'Browser does not support speech recognition';
    }

    // --- Microphone Button Interaction ---
    let isListening = false;

    micButton.addEventListener('click', function() {
        console.log('Microphone button clicked');
        
        if (!SpeechRecognition) {
            console.log('Speech recognition not supported, showing error message');
            const transcriptContainer = document.querySelector('.transcript-container');
            const transcriptText = document.getElementById('transcript');
            transcriptText.textContent = 'Browser does not support speech recognition';
            transcriptContainer.classList.add('visible');
            return;
        }

        isListening = !isListening;
        micButton.classList.toggle('is-listening', isListening);
        const transcriptContainer = document.querySelector('.transcript-container');
        const transcriptText = document.getElementById('transcript');

        if (isListening) {
            console.log('Starting speech recognition');
            transcriptText.textContent = 'Requesting microphone permission...';
            transcriptContainer.classList.add('visible');
            try {
                recognition.start();
            } catch (error) {
                console.error('Failed to start speech recognition:', error);
                transcriptText.textContent = `Startup failed: ${error.message}`;
            }
        } else {
            console.log('Stopping speech recognition');
            try {
                recognition.stop();
            } catch (error) {
                console.error('Failed to stop speech recognition:', error);
            }
            transcriptContainer.classList.remove('visible');
            transcriptText.textContent = '';
        }
    });


    // --- Floating Button Interaction ---
    floatingButton.addEventListener('click', (event) => {
        event.stopPropagation(); // Prevent event bubbling to document
        menuContainer.classList.toggle('hidden');
    });

    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            const videoSrc = this.getAttribute('data-video');
            playSpecificVideo(videoSrc);
            menuContainer.classList.add('hidden');
        });
    });

    // Click outside menu area to close menu
    document.addEventListener('click', () => {
        if (!menuContainer.classList.contains('hidden')) {
            menuContainer.classList.add('hidden');
        }
    });

    // Prevent menu itself from bubbling click events
    menuContainer.addEventListener('click', (event) => {
        event.stopPropagation();
    });


    function playSpecificVideo(videoSrc) {
        const currentVideoSrc = activeVideo.querySelector('source').getAttribute('src');
        if (videoSrc === currentVideoSrc) return;

        inactiveVideo.querySelector('source').setAttribute('src', videoSrc);
        inactiveVideo.load();

        inactiveVideo.addEventListener('canplaythrough', function onCanPlayThrough() {
            inactiveVideo.removeEventListener('canplaythrough', onCanPlayThrough);
            activeVideo.pause(); // Pause current video to prevent its 'ended' event from triggering switch
            inactiveVideo.play().catch(error => console.error("Video play failed:", error));
            activeVideo.classList.remove('active');
            inactiveVideo.classList.add('active');
            [activeVideo, inactiveVideo] = [inactiveVideo, activeVideo];
            activeVideo.addEventListener('ended', switchVideo, { once: true });
        }, { once: true });
    }

    // --- Helper Function to Detect Male Voices ---
    function isMaleVoice(voiceName) {
        const maleName = voiceName.toLowerCase();
        const maleVoiceKeywords = [
            'male', 'man', 'david', 'mark', 'alex', 'daniel', 'john', 'mike', 'michael',
            'tom', 'james', 'robert', 'william', 'richard', 'charles', 'christopher',
            'matthew', 'anthony', 'donald', 'steven', 'paul', 'andrew', 'joshua',
            'kenneth', 'kevin', 'brian', 'george', 'edward', 'ronald', 'timothy',
            'jason', 'jeffrey', 'ryan', 'jacob', 'gary', 'nicholas', 'eric', 'jonathan',
            'stephen', 'larry', 'justin', 'scott', 'brandon', 'benjamin', 'samuel',
            'gregory', 'frank', 'raymond', 'alexander', 'patrick', 'jack', 'dennis',
            'jerry', 'tyler', 'aaron', 'jose', 'henry', 'adam', 'douglas', 'nathan',
            'peter', 'zachary', 'kyle', 'noah', 'alan', 'ethan', 'jeremy', 'lionel',
            'ravi', 'jorge', 'diego', 'tom', 'guy', 'arthur', 'fred', 'victor'
        ];
        
        return maleVoiceKeywords.some(keyword => maleName.includes(keyword));
    }

    // --- TTS Text-to-Speech Functionality ---
    function speakText(text, emotion = 'neutral') {
        console.log('Attempting to play speech:', text);
        
        // Check if browser supports speech synthesis
        if ('speechSynthesis' in window) {
            // Stop current speech
            window.speechSynthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(text);
            const speakingIndicator = document.getElementById('speaking-indicator');
            
            // FORCE English language - this is critical!
            utterance.lang = 'en-US'; // Force English
            utterance.rate = 0.9; // Slightly slower for clarity
            utterance.pitch = 1.1; // Balanced pitch for natural sound
            utterance.volume = 1.0; // Volume set to maximum
            
            // Adjust speech parameters based on emotion
            switch(emotion) {
                case 'positive':
                    utterance.rate = 1.0;
                    utterance.pitch = 1.2;
                    break;
                case 'negative':
                    utterance.rate = 0.8;
                    utterance.pitch = 0.95;
                    break;
                default:
                    utterance.rate = 0.9;
                    utterance.pitch = 1.1;
            }
            
            // Wait for voice list to load
            const speakWhenReady = () => {
                const voices = window.speechSynthesis.getVoices();
                console.log('Available voices:', voices.length);
                voices.forEach((voice, index) => {
                    console.log(`Voice ${index}: ${voice.name} (${voice.lang})`);
                });
                
                // Prioritize high-quality premium FEMALE voices first
                let selectedVoice = voices.find(voice => 
                    voice.lang.startsWith('en') && 
                    !voice.lang.includes('zh') && // Exclude any Chinese
                    !voice.lang.includes('CN') && // Exclude Chinese 
                    !isMaleVoice(voice.name) && // Exclude male voices
                    (voice.name.toLowerCase().includes('natural') || 
                     voice.name.toLowerCase().includes('neural') ||
                     voice.name.toLowerCase().includes('premium') ||
                     voice.name.toLowerCase().includes('enhanced'))
                );
                
                // Try premium female voices
                if (!selectedVoice) {
                    selectedVoice = voices.find(voice => 
                        voice.lang.startsWith('en') && 
                        !voice.lang.includes('zh') && // Exclude any Chinese
                        !voice.lang.includes('CN') && // Exclude Chinese 
                        !isMaleVoice(voice.name) && // Exclude male voices
                        (voice.name.toLowerCase().includes('samantha') ||
                         voice.name.toLowerCase().includes('karen') ||
                         voice.name.toLowerCase().includes('susan') ||
                         voice.name.toLowerCase().includes('zira') ||
                         voice.name.toLowerCase().includes('hazel') ||
                         voice.name.toLowerCase().includes('aria') ||
                         voice.name.toLowerCase().includes('jenny') ||
                         voice.name.toLowerCase().includes('michelle') ||
                         voice.name.toLowerCase().includes('helen') ||
                         voice.name.toLowerCase().includes('anna') ||
                         voice.name.toLowerCase().includes('emma') ||
                         voice.name.toLowerCase().includes('sarah') ||
                         voice.name.toLowerCase().includes('kate') ||
                         voice.name.toLowerCase().includes('lisa'))
                    );
                }
                
                // Try any female English voice
                if (!selectedVoice) {
                    selectedVoice = voices.find(voice => 
                        voice.lang.startsWith('en') && 
                        !voice.lang.includes('zh') && // Exclude any Chinese
                        !voice.lang.includes('CN') && // Exclude Chinese 
                        !isMaleVoice(voice.name) && // Exclude male voices
                        (voice.name.toLowerCase().includes('female') || 
                         voice.name.toLowerCase().includes('woman'))
                    );
                }
                
                // If no explicitly female voice, use any high-quality NON-MALE English voice
                if (!selectedVoice) {
                    selectedVoice = voices.find(voice => 
                        voice.lang.startsWith('en') &&
                        !voice.lang.includes('zh') && // Exclude Chinese
                        !voice.lang.includes('CN') && // Exclude Chinese
                        !isMaleVoice(voice.name) && // Exclude male voices
                        voice.localService === false // Prefer cloud-based voices (usually higher quality)
                    );
                }
                
                // Fallback to any NON-MALE English voice (US, UK, AU, etc.)
                if (!selectedVoice) {
                    selectedVoice = voices.find(voice => 
                        voice.lang.startsWith('en') &&
                        !voice.lang.includes('zh') && // Exclude Chinese
                        !voice.lang.includes('CN') && // Exclude Chinese
                        !isMaleVoice(voice.name) // Exclude male voices
                    );
                }
                
                // Final fallback - use first NON-MALE, NON-Chinese voice
                if (!selectedVoice && voices.length > 0) {
                    selectedVoice = voices.find(voice => 
                        !voice.lang.includes('zh') && 
                        !voice.lang.includes('CN') &&
                        !isMaleVoice(voice.name) // Exclude male voices even in fallback
                    );
                    
                    // If still no voice found, use the first non-Chinese voice (last resort)
                    if (!selectedVoice) {
                        selectedVoice = voices.find(voice => 
                            !voice.lang.includes('zh') && 
                            !voice.lang.includes('CN')
                        ) || voices[0];
                    }
                    utterance.lang = 'en-US'; // Force English language
                }
                
                if (selectedVoice) {
                    utterance.voice = selectedVoice;
                    // Double-check: if selected voice is Chinese, force English language
                    if (selectedVoice.lang.includes('zh') || selectedVoice.lang.includes('CN')) {
                        utterance.lang = 'en-US';
                        console.log('Forced English language over Chinese voice');
                    } else {
                        utterance.lang = selectedVoice.lang.startsWith('en') ? selectedVoice.lang : 'en-US';
                    }
                    
                    // Log voice selection with male/female detection
                    const voiceGender = isMaleVoice(selectedVoice.name) ? 'MALE' : 'FEMALE';
                    console.log(`Using voice: ${selectedVoice.name} (${voiceGender}) - ${selectedVoice.lang} - Final lang: ${utterance.lang}`);
                } else {
                    console.log('Using default voice with forced English');
                    utterance.lang = 'en-US'; // Ensure English language
                }
                
                // Speech start and end callbacks
                utterance.onstart = () => {
                    console.log('Bella started speaking');
                    speakingIndicator.classList.add('active');
                };
                
                utterance.onend = () => {
                    console.log('Bella finished speaking');
                    speakingIndicator.classList.remove('active');
                };
                
                utterance.onerror = (event) => {
                    console.error('Speech playback error:', event.error);
                    speakingIndicator.classList.remove('active');
                    alert('Speech error: ' + event.error);
                };
                
                // Play speech
                console.log('Starting speech playback...');
                try {
                    window.speechSynthesis.speak(utterance);
                    
                    // Fallback: if speech doesn't start in 1 second, try again
                    setTimeout(() => {
                        if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
                            console.log('Speech didn\'t start, trying again...');
                            window.speechSynthesis.speak(utterance);
                        }
                    }, 1000);
                } catch (error) {
                    console.error('Error starting speech:', error);
                    speakingIndicator.classList.remove('active');
                }
            };
            
            // If voice list is already loaded, play directly
            if (window.speechSynthesis.getVoices().length > 0) {
                speakWhenReady();
            } else {
                // Wait for voice list to load
                console.log('Waiting for voices to load...');
                window.speechSynthesis.onvoiceschanged = speakWhenReady;
                
                // Fallback: try again after 500ms
                setTimeout(() => {
                    if (window.speechSynthesis.getVoices().length > 0) {
                        speakWhenReady();
                    }
                }, 500);
            }
            
        } else {
            console.log('Browser does not support speech synthesis');
            alert('Your browser does not support speech synthesis');
        }
    }

    // --- Intelligent Response System ---
    function generateResponse(userInput) {
        const input = userInput.toLowerCase();
        
        // Greetings
        if (input.includes('hello') || input.includes('hi') || input.includes('hey') || input.includes('你好')) {
            const greetings = [
                'Hello! Nice to meet you!',
                'Hi! How are you today?',
                'Hey there! What can I help you with?'
            ];
            return greetings[Math.floor(Math.random() * greetings.length)];
        }
        
        // Compliments
        if (input.includes('beautiful') || input.includes('pretty') || input.includes('gorgeous') || input.includes('漂亮')) {
            const complimentResponses = [
                'Thank you for the compliment! You are so sweet!',
                'You are making me blush!',
                'Thank you! You have great taste!'
            ];
            return complimentResponses[Math.floor(Math.random() * complimentResponses.length)];
        }
        
        // Name inquiry
        if (input.includes('your name') || input.includes('who are you') || input.includes('name')) {
            return 'I am Bella, your AI assistant! Nice to meet you!';
        }
        
        // Mood or status inquiry
        if (input.includes('how are you') || input.includes('feeling') || input.includes('mood')) {
            const moodResponses = [
                'I feel great! Chatting with you makes me happy!',
                'I am in a good mood today! How about you?',
                'Feeling fantastic! Thank you for asking!'
            ];
            return moodResponses[Math.floor(Math.random() * moodResponses.length)];
        }
        
        // Expressing like/love
        if (input.includes('like') || input.includes('love')) {
            return 'I really enjoy spending time with you too!';
        }
        
        // Thanks
        if (input.includes('thank') || input.includes('thanks')) {
            return 'You are welcome! I am happy to help!';
        }
        
        // Goodbye
        if (input.includes('goodbye') || input.includes('bye') || input.includes('see you')) {
            const farewells = [
                'Goodbye! Looking forward to seeing you again!',
                'Bye bye! Don\'t forget to think of me!',
                'See you later! Have a wonderful day!'
            ];
            return farewells[Math.floor(Math.random() * farewells.length)];
        }
        
        // Positive emotions
        if (input.includes('happy') || input.includes('excited') || input.includes('joy')) {
            return 'Seeing you happy makes me happy too! Let\'s keep this good mood going!';
        }
        
        // Negative emotions
        if (input.includes('sad') || input.includes('upset') || input.includes('down')) {
            return 'Don\'t be sad! I will always be here for you! Everything will be okay!';
        }
        
        // Default responses
        const defaultResponses = [
            'That sounds interesting! Can you tell me more?',
            'I am listening! Please continue!',
            'That is very interesting! What else would you like to share?',
            'I understand! You have great ideas!',
            'That sounds nice! I love chatting with you!'
        ];
        
        return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
    }

    // --- Emotion Analysis and Reaction ---
    const positiveWords = ['happy', 'excited', 'joy', 'great', 'awesome', 'hello', 'beautiful', 'love', 'good', 'nice', '开心', '高兴', '喜欢', '太棒了', '你好', '漂亮', '爱', '棒', '好'];
    const negativeWords = ['sad', 'angry', 'hate', 'upset', 'terrible', 'bad', '难过', '生气', '讨厌', '伤心', '不开心', '糟糕'];

    const positiveVideos = [
        '视频资源/jimeng-2025-07-16-1043-笑着优雅的左右摇晃，过一会儿手扶着下巴，保持微笑.mp4',
        '视频资源/jimeng-2025-07-16-4437-比耶，然后微笑着优雅的左右摇晃.mp4',
        '视频资源/生成加油视频.mp4',
        '视频资源/生成跳舞视频.mp4'
    ];
    const negativeVideo = '视频资源/负面/jimeng-2025-07-16-9418-双手叉腰，嘴巴一直在嘟囔，表情微微生气.mp4';

    function analyzeAndReact(text) {
        console.log('Analyzing user input:', text);
        
        // Generate Bella's response
        const response = generateResponse(text);
        console.log('Bella\'s response:', response);
        
        // Voice response
        let emotion = 'neutral';
        if (positiveWords.some(word => text.includes(word))) {
            emotion = 'positive';
        } else if (negativeWords.some(word => text.includes(word))) {
            emotion = 'negative';
        }
        
        // Bella speaks
        speakText(response, emotion);
        
        // Display Bella's response on screen
        const transcriptContainer = document.getElementById('transcript');
        setTimeout(() => {
            transcriptContainer.textContent = `Bella: ${response}`;
        }, 500);
        
        // Switch video based on emotion
        if (emotion !== 'neutral') {
            switchVideoByEmotion(emotion);
        }
    }

    function switchVideoByEmotion(emotion) {
        let nextVideoSrc;
        if (emotion === 'positive') {
            const randomIndex = Math.floor(Math.random() * positiveVideos.length);
            nextVideoSrc = positiveVideos[randomIndex];
        } else { // negative
            nextVideoSrc = negativeVideo;
        }

        // Avoid playing the same video repeatedly
        const currentVideoSrc = activeVideo.querySelector('source').getAttribute('src');
        if (nextVideoSrc === currentVideoSrc) return;

        // --- Following logic is similar to switchVideo function, used for video switching ---
        inactiveVideo.querySelector('source').setAttribute('src', nextVideoSrc);
        inactiveVideo.load();

        inactiveVideo.addEventListener('canplaythrough', function onCanPlayThrough() {
            inactiveVideo.removeEventListener('canplaythrough', onCanPlayThrough);
            activeVideo.pause(); // Pause current video to prevent its 'ended' event from triggering switch
            inactiveVideo.play().catch(error => console.error("Video play failed:", error));
            activeVideo.classList.remove('active');
            inactiveVideo.classList.add('active');
            [activeVideo, inactiveVideo] = [inactiveVideo, activeVideo];
            // After emotion-triggered video finishes, return to random playback
            activeVideo.addEventListener('ended', switchVideo, { once: true });
        }, { once: true });
    }

});