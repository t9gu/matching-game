// ============================================
// 单词连连看游戏主类
// ============================================
class MatchingGame {
    constructor() {
        this.hands = null;
        this.camera = null;
        this.video = null;
        this.handCanvas = null;
        this.handCtx = null;
        
        this.gameState = 'start'; // start, playing, result
        this.cards = [];
        this.selectedCards = [];
        this.matchedPairs = 0;
        this.totalPairs = 8;
        this.combo = 0;
        this.maxCombo = 0;
        
        this.startTime = null;
        this.timerInterval = null;
        
        this.fingerTip = null;
        this.lastFingerTip = null;
        this.isPointing = false;
        
        this.audioContext = null;
        this.backgroundMusic = null;
        this.isMusicPlaying = false;
        this.musicTimeoutId = null;
        this.activeOscillators = [];
        
        this.customMusicAudio = null;
        this.useCustomMusic = false;
        
        this.isCheckingMatch = false;
        this.isReshuffling = false;
        
        this.lastActionTime = null;
        this.inactivityCheckInterval = null;
        this.videoStream = null;
        
        this.init();
    }

    // ============================================
    // 初始化
    // ============================================
    init() {
        this.initAudio();
        this.initMediaPipe();
        this.setupCanvas();
        this.setupMusicUpload();
        this.setupHintDialog();
    }

    // ============================================
    // 初始化音频
    // ============================================
    initAudio() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    // ============================================
    // 设置音乐上传
    // ============================================
    setupMusicUpload() {
        const uploadBtn = document.getElementById('uploadMusicBtn');
        const useDefaultBtn = document.getElementById('useDefaultMusicBtn');
        const fileInput = document.getElementById('musicUpload');
        
        uploadBtn.addEventListener('click', () => {
            fileInput.click();
        });
        
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && file.type.startsWith('audio/')) {
                const url = URL.createObjectURL(file);
                
                if (this.customMusicAudio) {
                    this.customMusicAudio.pause();
                    URL.revokeObjectURL(this.customMusicAudio.src);
                }
                
                this.customMusicAudio = new Audio(url);
                this.customMusicAudio.loop = true;
                this.customMusicAudio.volume = 0.5;
                this.useCustomMusic = true;
                
                uploadBtn.style.display = 'none';
                useDefaultBtn.style.display = 'inline-block';
                
                // 如果正在游戏中，切换到自定义音乐
                if (this.gameState === 'playing') {
                    this.stopBackgroundMusic();
                    this.playBackgroundMusic();
                }
            }
        });
        
        useDefaultBtn.addEventListener('click', () => {
            this.useCustomMusic = false;
            
            if (this.customMusicAudio) {
                this.customMusicAudio.pause();
            }
            
            uploadBtn.style.display = 'inline-block';
            useDefaultBtn.style.display = 'none';
            
            // 如果正在游戏中，切换到默认音乐
            if (this.gameState === 'playing') {
                this.stopBackgroundMusic();
                this.playBackgroundMusic();
            }
        });
    }

    // ============================================
    // 播放背景音乐
    // ============================================
    playBackgroundMusic() {
        // 如果使用自定义音乐
        if (this.useCustomMusic && this.customMusicAudio) {
            this.stopBackgroundMusic();
            this.customMusicAudio.currentTime = 0;
            this.customMusicAudio.play().catch(e => {
                console.error('播放自定义音乐失败:', e);
            });
            this.isMusicPlaying = true;
            return;
        }
        // 先停止任何正在播放的音乐
        this.stopBackgroundMusic();
        
        this.isMusicPlaying = true;
        const playMusicLoop = () => {
            if (!this.isMusicPlaying) return;
            
            // 创建一个欢快的旋律循环
            const melody = [
                { freq: 523.25, duration: 0.3 }, // C5
                { freq: 587.33, duration: 0.3 }, // D5
                { freq: 659.25, duration: 0.3 }, // E5
                { freq: 698.46, duration: 0.3 }, // F5
                { freq: 783.99, duration: 0.6 }, // G5
                { freq: 698.46, duration: 0.3 }, // F5
                { freq: 659.25, duration: 0.3 }, // E5
                { freq: 587.33, duration: 0.6 }, // D5
                { freq: 523.25, duration: 0.3 }, // C5
                { freq: 587.33, duration: 0.3 }, // D5
                { freq: 659.25, duration: 0.6 }, // E5
                { freq: 523.25, duration: 0.9 }  // C5
            ];
            
            let currentTime = this.audioContext.currentTime;
            
            melody.forEach(note => {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                oscillator.frequency.setValueAtTime(note.freq, currentTime);
                oscillator.type = 'sine';
                
                gainNode.gain.setValueAtTime(0, currentTime);
                gainNode.gain.linearRampToValueAtTime(0.1, currentTime + 0.01);
                gainNode.gain.linearRampToValueAtTime(0.08, currentTime + note.duration * 0.8);
                gainNode.gain.linearRampToValueAtTime(0, currentTime + note.duration);
                
                oscillator.start(currentTime);
                oscillator.stop(currentTime + note.duration);
                
                // 保存oscillator以便后续停止
                this.activeOscillators.push({ osc: oscillator, gain: gainNode, stopTime: currentTime + note.duration });
                
                currentTime += note.duration;
            });
            
            // 清理已经停止的oscillator
            const now = this.audioContext.currentTime;
            this.activeOscillators = this.activeOscillators.filter(item => item.stopTime > now);
            
            // 循环播放
            this.musicTimeoutId = setTimeout(playMusicLoop, currentTime * 1000 - this.audioContext.currentTime * 1000 + 500);
        };
        
        playMusicLoop();
    }

    // ============================================
    // 停止背景音乐
    // ============================================
    stopBackgroundMusic() {
        this.isMusicPlaying = false;
        
        // 停止自定义音乐
        if (this.customMusicAudio) {
            this.customMusicAudio.pause();
        }
        
        // 清除定时器
        if (this.musicTimeoutId) {
            clearTimeout(this.musicTimeoutId);
            this.musicTimeoutId = null;
        }
        
        // 立即停止所有正在播放的oscillator
        const now = this.audioContext.currentTime;
        this.activeOscillators.forEach(item => {
            try {
                // 快速淡出
                item.gain.gain.cancelScheduledValues(now);
                item.gain.gain.setValueAtTime(item.gain.gain.value, now);
                item.gain.gain.linearRampToValueAtTime(0, now + 0.05);
                
                // 停止oscillator
                if (item.stopTime > now) {
                    item.osc.stop(now + 0.05);
                }
            } catch (e) {
                // 忽略已经停止的oscillator
            }
        });
        
        this.activeOscillators = [];
    }

    // ============================================
    // 播放音效
    // ============================================
    playSound(frequency, duration, type = 'success') {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        if (type === 'success') {
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(frequency * 2, this.audioContext.currentTime + duration);
        } else if (type === 'error') {
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.5, this.audioContext.currentTime + duration);
        }
        
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    // ============================================
    // 设置Canvas
    // ============================================
    setupCanvas() {
        this.handCanvas = document.getElementById('handCanvas');
        this.handCtx = this.handCanvas.getContext('2d');
        this.handCanvas.width = window.innerWidth;
        this.handCanvas.height = window.innerHeight;
        
        window.addEventListener('resize', () => {
            this.handCanvas.width = window.innerWidth;
            this.handCanvas.height = window.innerHeight;
        });
    }

    // ============================================
    // 设置提示对话框
    // ============================================
    setupHintDialog() {
        const yesBtn = document.getElementById('hintYesBtn');
        const noBtn = document.getElementById('hintNoBtn');
        
        if (yesBtn && noBtn) {
            yesBtn.addEventListener('click', () => {
                this.showHint();
                this.hideHintDialog();
            });
            
            noBtn.addEventListener('click', () => {
                this.hideHintDialog();
                this.resetInactivityTimer();
            });
        } else {
            console.warn('提示对话框按钮未找到，将在DOM加载后重试');
        }
    }

    // ============================================
    // 初始化MediaPipe
    // ============================================
    initMediaPipe() {
        this.video = document.getElementById('video');
        
        this.hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/${file}`;
            }
        });
        
        this.hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
        
        this.hands.onResults((results) => this.onHandsResults(results));
        
        this.camera = new Camera(this.video, {
            onFrame: async () => {
                if (this.hands) {
                    await this.hands.send({ image: this.video });
                }
            },
            width: 1280,
            height: 720
        });
        
        this.camera.start()
            .then(() => {
                console.log('摄像头启动成功');
                // 保存视频流引用
                return navigator.mediaDevices.getUserMedia({ video: true });
            })
            .then(stream => {
                this.videoStream = stream;
                // 摄像头启动成功，隐藏加载提示
                this.hideLoading();
                console.log('MediaPipe初始化完成');
            })
            .catch(err => {
                console.error('MediaPipe初始化失败:', err);
                this.hideLoading();
                this.showCameraError(err);
            });
    }

    // ============================================
    // 隐藏加载提示
    // ============================================
    hideLoading() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = 'none';
        }
    }

    // ============================================
    // 显示摄像头错误提示
    // ============================================
    showCameraError(err) {
        const loading = document.getElementById('loading');
        if (loading) {
            let errorMessage = '❌ 摄像头启动失败\n\n';
            
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                errorMessage += '📷 请检查摄像头权限设置：\n\n';
                errorMessage += '1. 点击浏览器地址栏左侧的锁图标\n';
                errorMessage += '2. 找到"摄像头"权限设置\n';
                errorMessage += '3. 选择"允许"\n';
                errorMessage += '4. 刷新页面重试\n\n';
                errorMessage += '💡 提示：您可能需要在系统设置中允许浏览器访问摄像头';
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                errorMessage += '📷 未检测到摄像头设备\n\n';
                errorMessage += '请确保：\n';
                errorMessage += '1. 摄像头已正确连接\n';
                errorMessage += '2. 摄像头驱动已安装\n';
                errorMessage += '3. 没有其他应用占用摄像头';
            } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                errorMessage += '📷 摄像头被其他应用占用\n\n';
                errorMessage += '请关闭其他正在使用摄像头的应用';
            } else {
                errorMessage += '📷 发生未知错误\n\n';
                errorMessage += '错误信息：' + err.message;
            }
            
            loading.innerHTML = `<div style="color: #f5576c; font-size: 18px; white-space: pre-line; text-align: center; padding: 40px;">${errorMessage}</div>`;
            loading.style.display = 'flex';
        }
    }

    // ============================================
    // 处理手部识别结果
    // ============================================
    onHandsResults(results) {
        this.handCtx.clearRect(0, 0, this.handCanvas.width, this.handCanvas.height);
        
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            
            this.drawCyberpunkHand(landmarks);
            
            const indexFingerTip = landmarks[8];
            const indexFingerDip = landmarks[7];
            const middleFingerTip = landmarks[12];
            
            const indexExtended = indexFingerTip.y < indexFingerDip.y - 0.05;
            const middleFolded = middleFingerTip.y > landmarks[10].y;
            
            this.isPointing = indexExtended && middleFolded;
            
            if (this.isPointing) {
                // 直接使用1:1映射，不做任何转换
                this.fingerTip = {
                    x: (1 - indexFingerTip.x) * window.innerWidth,
                    y: indexFingerTip.y * window.innerHeight
                };
                
                this.drawPointer(this.fingerTip.x, this.fingerTip.y);
                
                if (this.gameState === 'playing') {
                    this.checkCardHover();
                }
            } else {
                this.fingerTip = null;
            }
            
            this.lastFingerTip = this.fingerTip;
        }
    }

    // ============================================
    // 绘制赛博朋克风格手部骨骼
    // ============================================
    drawCyberpunkHand(landmarks) {
        const connections = [
            [0, 1], [1, 2], [2, 3], [3, 4],
            [0, 5], [5, 6], [6, 7], [7, 8],
            [5, 9], [9, 10], [10, 11], [11, 12],
            [9, 13], [13, 14], [14, 15], [15, 16],
            [13, 17], [17, 18], [18, 19], [19, 20],
            [0, 17]
        ];
        
        this.handCtx.lineWidth = 3;
        this.handCtx.shadowBlur = 20;
        
        connections.forEach(([start, end]) => {
            const startPoint = landmarks[start];
            const endPoint = landmarks[end];
            
            const gradient = this.handCtx.createLinearGradient(
                (1 - startPoint.x) * this.handCanvas.width,
                startPoint.y * this.handCanvas.height,
                (1 - endPoint.x) * this.handCanvas.width,
                endPoint.y * this.handCanvas.height
            );
            gradient.addColorStop(0, '#0ff');
            gradient.addColorStop(0.5, '#f0f');
            gradient.addColorStop(1, '#ff0');
            
            this.handCtx.strokeStyle = gradient;
            this.handCtx.shadowColor = '#0ff';
            
            this.handCtx.beginPath();
            this.handCtx.moveTo(
                (1 - startPoint.x) * this.handCanvas.width,
                startPoint.y * this.handCanvas.height
            );
            this.handCtx.lineTo(
                (1 - endPoint.x) * this.handCanvas.width,
                endPoint.y * this.handCanvas.height
            );
            this.handCtx.stroke();
        });
        
        landmarks.forEach((landmark, index) => {
            const x = (1 - landmark.x) * this.handCanvas.width;
            const y = landmark.y * this.handCanvas.height;
            
            const gradient = this.handCtx.createRadialGradient(x, y, 0, x, y, 8);
            gradient.addColorStop(0, '#fff');
            gradient.addColorStop(0.5, '#0ff');
            gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
            
            this.handCtx.fillStyle = gradient;
            this.handCtx.shadowColor = index === 8 ? '#f0f' : '#0ff';
            this.handCtx.shadowBlur = 15;
            
            this.handCtx.beginPath();
            this.handCtx.arc(x, y, index === 8 ? 10 : 6, 0, Math.PI * 2);
            this.handCtx.fill();
        });
    }

    // ============================================
    // 绘制指针
    // ============================================
    drawPointer(x, y) {
        const gradient = this.handCtx.createRadialGradient(x, y, 0, x, y, 30);
        gradient.addColorStop(0, 'rgba(255, 0, 255, 0.8)');
        gradient.addColorStop(0.5, 'rgba(0, 255, 255, 0.4)');
        gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
        
        this.handCtx.fillStyle = gradient;
        this.handCtx.shadowColor = '#f0f';
        this.handCtx.shadowBlur = 30;
        
        this.handCtx.beginPath();
        this.handCtx.arc(x, y, 25, 0, Math.PI * 2);
        this.handCtx.fill();
        
        this.handCtx.strokeStyle = '#fff';
        this.handCtx.lineWidth = 3;
        this.handCtx.shadowBlur = 20;
        this.handCtx.beginPath();
        this.handCtx.arc(x, y, 20, 0, Math.PI * 2);
        this.handCtx.stroke();
    }

    // ============================================
    // 检查卡片悬停
    // ============================================
    checkCardHover() {
        if (!this.fingerTip) return;
        if (this.isReshuffling) return;
        
        const cards = document.querySelectorAll('.card:not(.matched)');
        cards.forEach(card => {
            const rect = card.getBoundingClientRect();
            
            // 扩大识别区域50像素
            const expandMargin = 50;
            const expandedRect = {
                left: rect.left - expandMargin,
                right: rect.right + expandMargin,
                top: rect.top - expandMargin,
                bottom: rect.bottom + expandMargin
            };
            
            if (this.fingerTip.x >= expandedRect.left && 
                this.fingerTip.x <= expandedRect.right &&
                this.fingerTip.y >= expandedRect.top && 
                this.fingerTip.y <= expandedRect.bottom) {
                
                if (!card.classList.contains('selected')) {
                    this.selectCard(card);
                }
            }
        });
    }

    // ============================================
    // 选择卡片
    // ============================================
    selectCard(cardElement) {
        const cardIndex = parseInt(cardElement.dataset.index);
        const card = this.cards[cardIndex];
        
        // 如果正在检查配对或打乱卡片，不允许选择新卡片
        if (this.isCheckingMatch) return;
        if (this.isReshuffling) return;
        if (this.selectedCards.length >= 2) return;
        if (this.selectedCards.some(c => c.index === cardIndex)) return;
        
        cardElement.classList.add('selected');
        this.selectedCards.push({ element: cardElement, data: card, index: cardIndex });
        
        this.playSound(440, 0.1, 'success');
        
        // 重置无操作计时器
        this.resetInactivityTimer();
        
        if (this.selectedCards.length === 2) {
            this.isCheckingMatch = true;
            setTimeout(() => this.checkMatch(), 500);
        }
    }

    // ============================================
    // 检查匹配
    // ============================================
    checkMatch() {
        const [card1, card2] = this.selectedCards;
        
        // 严格验证：必须是一个单词和一个图片
        const isMatch = card1 && card2 && 
                       card1.data && card2.data &&
                       card1.data.type !== card2.data.type &&
                       ((card1.data.type === 'word' && card2.data.type === 'image' && card1.data.word === card2.data.word) ||
                        (card1.data.type === 'image' && card2.data.type === 'word' && card1.data.word === card2.data.word));
        
        if (isMatch) {
            card1.element.classList.add('matched');
            card2.element.classList.add('matched');
            
            this.matchedPairs++;
            this.combo++;
            this.maxCombo = Math.max(this.maxCombo, this.combo);
            
            this.playFancySuccessSound();
            this.showFancyCelebration();
            
            document.getElementById('matched').textContent = this.matchedPairs;
            document.getElementById('combo').textContent = this.combo;
            
            setTimeout(() => {
                card1.element.style.display = 'none';
                card2.element.style.display = 'none';
                
                // 清除手指追踪状态，防止干扰重新打乱
                this.fingerTip = null;
                this.lastFingerTip = null;
                
                // 检查剩余卡片是否可配对
                setTimeout(() => {
                    this.checkAndReshuffleIfNeeded();
                }, 100);
            }, 600);
            
            if (this.matchedPairs === this.totalPairs) {
                setTimeout(() => this.endGame(), 1000);
            }
        } else {
            this.combo = 0;
            document.getElementById('combo').textContent = this.combo;
            
            this.playSound(200, 0.3, 'error');
            
            setTimeout(() => {
                if (card1 && card1.element) card1.element.classList.remove('selected');
                if (card2 && card2.element) card2.element.classList.remove('selected');
                this.isCheckingMatch = false;
            }, 800);
        }
        
        this.selectedCards = [];
        
        // 如果配对成功，在动画结束后解锁
        if (!isMatch) {
            // 失败的话在800ms后已经解锁
        } else {
            // 成功的话在卡片消失后解锁
            setTimeout(() => {
                this.isCheckingMatch = false;
            }, 1000);
        }
    }

    // ============================================
    // 检查并重新打乱卡片（如果无法配对）
    // ============================================
    checkAndReshuffleIfNeeded() {
        const gameBoard = document.getElementById('gameBoard');
        const cardElements = Array.from(gameBoard.children).filter(el => el.style.display !== 'none');
        
        const remainingCards = this.cards.filter((card, index) => {
            const cardElement = document.querySelector(`.card[data-index="${index}"]`);
            return cardElement && cardElement.style.display !== 'none';
        });
        
        if (remainingCards.length === 0) return;
        
        // 输出剩余卡片的详细信息
        console.log('=== 检查剩余卡片 ===');
        console.log(`剩余卡片数量: ${remainingCards.length}`);
        const remainingInfo = cardElements.map((el, i) => {
            const index = parseInt(el.dataset.index);
            const card = this.cards[index];
            return `位置${index}(${card.type}:${card.word})`;
        }).join(', ');
        console.log(`剩余卡片布局: ${remainingInfo}`);
        
        // 首先检查剩余卡片是否可以配对（每个单词都有对应的图片）
        if (!this.canRemainingCardsPair(remainingCards)) {
            console.error('严重错误：剩余卡片无法配对！单词和图片不匹配');
            console.log('剩余卡片：', remainingCards.map(c => `${c.type}:${c.word}`));
            alert('游戏出现错误：剩余卡片无法配对。请刷新页面重新开始。');
            return;
        }
        
        // 检查是否存在可配对的相邻卡片
        const hasValidMatch = this.checkForValidMatches(remainingCards);
        
        if (!hasValidMatch) {
            console.log('没有找到可配对的相邻卡片，需要重新打乱');
            // 没有可配对的相邻卡片，需要重新打乱
            this.reshuffleRemainingCards();
        } else {
            console.log('找到可配对的相邻卡片，游戏继续');
        }
    }

    // ============================================
    // 检查剩余卡片是否可以配对
    // ============================================
    canRemainingCardsPair(remainingCards) {
        // 统计每个单词的word和image数量
        const wordCount = {};
        
        remainingCards.forEach(card => {
            if (!wordCount[card.word]) {
                wordCount[card.word] = { word: 0, image: 0 };
            }
            if (card.type === 'word') {
                wordCount[card.word].word++;
            } else {
                wordCount[card.word].image++;
            }
        });
        
        // 检查每个单词是否都有对应的图片
        for (const word in wordCount) {
            if (wordCount[word].word !== wordCount[word].image) {
                console.error(`单词"${word}"的word和image数量不匹配: word=${wordCount[word].word}, image=${wordCount[word].image}`);
                return false;
            }
        }
        
        return true;
    }

    // ============================================
    // 检查是否存在可配对的相邻卡片
    // ============================================
    checkForValidMatches(remainingCards) {
        const gameBoard = document.getElementById('gameBoard');
        const cardElements = Array.from(gameBoard.children).filter(el => el.style.display !== 'none');
        
        console.log('检查可配对的相邻卡片...');
        console.log(`剩余卡片数量: ${cardElements.length}`);
        
        // 使用剩余卡片在Grid中的实际显示位置来判断相邻关系
        for (let i = 0; i < cardElements.length; i++) {
            const card1Index = parseInt(cardElements[i].dataset.index);
            const card1 = this.cards[card1Index];
            
            // 获取在Grid中的相邻位置（基于剩余卡片的实际显示位置）
            const neighbors = this.getNeighborIndicesInGrid(i, cardElements.length);
            
            for (const neighborPos of neighbors) {
                if (neighborPos < cardElements.length) {
                    const card2Index = parseInt(cardElements[neighborPos].dataset.index);
                    const card2 = this.cards[card2Index];
                    
                    // 检查是否可以配对
                    if ((card1.type === 'word' && card2.type === 'image' && card1.word === card2.word) ||
                        (card1.type === 'image' && card2.type === 'word' && card1.word === card2.word)) {
                        console.log(`找到可配对的相邻卡片: Grid位置${i}[原始${card1Index}](${card1.type}:${card1.word}) 和 Grid位置${neighborPos}[原始${card2Index}](${card2.type}:${card2.word})`);
                        return true;
                    }
                }
            }
        }
        
        console.log('没有找到可配对的相邻卡片');
        return false;
    }

    // ============================================
    // 获取在Grid中的相邻位置索引
    // ============================================
    getNeighborIndicesInGrid(position, totalCards) {
        const gridSize = 4;
        const row = Math.floor(position / gridSize);
        const col = position % gridSize;
        const neighbors = [];
        
        // 上
        if (row > 0) neighbors.push(position - gridSize);
        // 下
        if (row < gridSize - 1 && position + gridSize < totalCards) neighbors.push(position + gridSize);
        // 左
        if (col > 0) neighbors.push(position - 1);
        // 右
        if (col < gridSize - 1 && position + 1 < totalCards) neighbors.push(position + 1);
        
        return neighbors;
    }

    // ============================================
    // 获取相邻位置索引（4x4网格）
    // ============================================
    getNeighborIndices(position, totalCards) {
        const gridSize = 4;
        const row = Math.floor(position / gridSize);
        const col = position % gridSize;
        const neighbors = [];
        
        // 上
        if (row > 0) neighbors.push(position - gridSize);
        // 下
        if (row < gridSize - 1 && position + gridSize < totalCards) neighbors.push(position + gridSize);
        // 左
        if (col > 0) neighbors.push(position - 1);
        // 右
        if (col < gridSize - 1 && position + 1 < totalCards) neighbors.push(position + 1);
        
        return neighbors;
    }

    // ============================================
    // 重新打乱剩余卡片
    // ============================================
    reshuffleRemainingCards() {
        // 设置打乱锁
        this.isReshuffling = true;
        
        // 清除所有选中状态
        this.selectedCards.forEach(selected => {
            if (selected && selected.element) {
                selected.element.classList.remove('selected');
            }
        });
        this.selectedCards = [];
        
        // 清除手指追踪，防止打乱后立即选中
        this.fingerTip = null;
        this.lastFingerTip = null;
        
        const gameBoard = document.getElementById('gameBoard');
        const cardElements = Array.from(gameBoard.children).filter(el => el.style.display !== 'none');
        
        // 获取剩余卡片的数据
        const remainingCardsData = cardElements.map(el => {
            const index = parseInt(el.dataset.index);
            return this.cards[index];
        });
        
        // 循环打乱直到找到可配对的布局
        let hasValidLayout = false;
        let attempts = 0;
        const maxAttempts = 100;
        let shuffledData = [];
        
        while (!hasValidLayout && attempts < maxAttempts) {
            shuffledData = this.shuffleArray(remainingCardsData);
            
            // 临时更新cards数组来检查
            const tempCards = [...this.cards];
            cardElements.forEach((el, i) => {
                const originalIndex = parseInt(el.dataset.index);
                tempCards[originalIndex] = shuffledData[i];
            });
            
            // 检查这个布局是否可配对
            hasValidLayout = this.checkRemainingCardsLayout(cardElements, tempCards);
            attempts++;
        }
        
        // 如果100次尝试后仍无法找到可配对布局，强制创建一个
        if (!hasValidLayout && shuffledData.length >= 2) {
            shuffledData = this.createGuaranteedRemainingLayout(shuffledData);
        }
        
        // 更新卡片内容
        cardElements.forEach((el, i) => {
            const card = shuffledData[i];
            const originalIndex = parseInt(el.dataset.index);
            
            // 更新cards数组中的数据
            this.cards[originalIndex] = card;
            
            // 更新DOM显示
            el.innerHTML = '';
            if (card.type === 'image') {
                // 如果是URL，加载图片
                if (card.display.startsWith('http')) {
                    const img = document.createElement('img');
                    img.src = card.display;
                    img.style.width = '100px';
                    img.style.height = '100px';
                    img.style.objectFit = 'contain';
                    el.appendChild(img);
                } else {
                    // 否则显示emoji
                    el.innerHTML = `
                        <div class="card-emoji">${card.display}</div>
                    `;
                }
            } else {
                el.innerHTML = `
                    <div class="card-text" style="font-size: 32px;">${card.display}</div>
                `;
            }
            
            // 添加重新打乱的动画效果
            el.style.animation = 'none';
            setTimeout(() => {
                el.style.animation = 'cardShuffle 0.5s ease';
            }, 10);
        });
        
        // 显示提示
        this.showCelebration('🔄');
        this.playSound(330, 0.2, 'success');
        
        console.log(`重新打乱完成，尝试次数: ${attempts}, 找到可配对布局: ${hasValidLayout}`);
        
        // 打乱动画结束后解锁，留出额外时间防止立即选中
        setTimeout(() => {
            this.isReshuffling = false;
            // 再次清除手指追踪，确保不会立即选中
            this.fingerTip = null;
            this.lastFingerTip = null;
        }, 1000);
    }

    // ============================================
    // 检查剩余卡片布局是否可配对
    // ============================================
    checkRemainingCardsLayout(cardElements, tempCards) {
        // 使用Grid中的实际显示位置来判断相邻关系
        for (let i = 0; i < cardElements.length; i++) {
            const card1Index = parseInt(cardElements[i].dataset.index);
            const card1 = tempCards[card1Index];
            
            // 获取在Grid中的相邻位置（基于剩余卡片的实际显示位置）
            const neighbors = this.getNeighborIndicesInGrid(i, cardElements.length);
            
            for (const neighborPos of neighbors) {
                if (neighborPos < cardElements.length) {
                    const card2Index = parseInt(cardElements[neighborPos].dataset.index);
                    const card2 = tempCards[card2Index];
                    
                    if ((card1.type === 'word' && card2.type === 'image' && card1.word === card2.word) ||
                        (card1.type === 'image' && card2.type === 'word' && card1.word === card2.word)) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }

    // ============================================
    // 获取剩余卡片中的相邻位置索引
    // ============================================
    getNeighborIndicesInRemaining(position, cardElements) {
        const neighbors = [];
        const gridSize = 4;
        
        // 获取所有剩余卡片在原网格中的位置
        const positions = cardElements.map(el => {
            const index = parseInt(el.dataset.index);
            return index;
        });
        
        const currentOriginalPos = positions[position];
        const currentRow = Math.floor(currentOriginalPos / gridSize);
        const currentCol = currentOriginalPos % gridSize;
        
        // 检查上下左右
        const potentialNeighbors = [
            currentOriginalPos - gridSize, // 上
            currentOriginalPos + gridSize, // 下
            currentOriginalPos - 1,        // 左
            currentOriginalPos + 1         // 右
        ];
        
        // 边界检查
        if (currentRow === 0) potentialNeighbors[0] = -1; // 没有上
        if (currentRow === 3) potentialNeighbors[1] = -1; // 没有下
        if (currentCol === 0) potentialNeighbors[2] = -1; // 没有左
        if (currentCol === 3) potentialNeighbors[3] = -1; // 没有右
        
        // 找到这些位置在剩余卡片数组中的索引
        potentialNeighbors.forEach(neighborOriginalPos => {
            if (neighborOriginalPos >= 0) {
                const neighborIndex = positions.indexOf(neighborOriginalPos);
                if (neighborIndex !== -1) {
                    neighbors.push(neighborIndex);
                }
            }
        });
        
        return neighbors;
    }

    // ============================================
    // 为剩余卡片创建保证可配对的布局
    // ============================================
    createGuaranteedRemainingLayout(cardsData) {
        // 找到第一对可配对的卡片
        for (let i = 0; i < cardsData.length; i++) {
            if (cardsData[i].type === 'word') {
                const word = cardsData[i].word;
                
                for (let j = 0; j < cardsData.length; j++) {
                    if (i !== j && cardsData[j].type === 'image' && cardsData[j].word === word) {
                        // 将这对卡片放在相邻位置（0和1）
                        const result = [...cardsData];
                        const temp = result[0];
                        result[0] = result[i];
                        result[i] = temp;
                        
                        const temp2 = result[1];
                        result[1] = result[j === 0 ? i : j];
                        result[j === 0 ? i : j] = temp2;
                        
                        return result;
                    }
                }
            }
        }
        
        return cardsData;
    }

    // ============================================
    // 播放华丽的成功音效
    // ============================================
    playFancySuccessSound() {
        const now = this.audioContext.currentTime;
        
        // 主旋律 - 上升音阶
        const mainMelody = [
            { freq: 523.25, time: 0, duration: 0.15 },    // C5
            { freq: 659.25, time: 0.1, duration: 0.15 },  // E5
            { freq: 783.99, time: 0.2, duration: 0.15 },  // G5
            { freq: 1046.50, time: 0.3, duration: 0.25 }  // C6
        ];
        
        mainMelody.forEach(note => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(note.freq, now + note.time);
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0, now + note.time);
            gainNode.gain.linearRampToValueAtTime(0.3, now + note.time + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + note.time + note.duration);
            
            oscillator.start(now + note.time);
            oscillator.stop(now + note.time + note.duration);
        });
        
        // 和声
        const harmony = [
            { freq: 659.25, time: 0.3, duration: 0.3 },   // E5
            { freq: 783.99, time: 0.3, duration: 0.3 }    // G5
        ];
        
        harmony.forEach(note => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(note.freq, now + note.time);
            oscillator.type = 'triangle';
            
            gainNode.gain.setValueAtTime(0, now + note.time);
            gainNode.gain.linearRampToValueAtTime(0.15, now + note.time + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + note.time + note.duration);
            
            oscillator.start(now + note.time);
            oscillator.stop(now + note.time + note.duration);
        });
        
        // 闪烁音效
        for (let i = 0; i < 5; i++) {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(2000 + i * 200, now + 0.4 + i * 0.05);
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.1, now + 0.4 + i * 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.45 + i * 0.05);
            
            oscillator.start(now + 0.4 + i * 0.05);
            oscillator.stop(now + 0.45 + i * 0.05);
        }
    }

    // ============================================
    // 显示华丽的庆祝动画
    // ============================================
    showFancyCelebration() {
        // 显示多个emoji
        const emojis = ['🎉', '✨', '🌟', '💫', '🎊'];
        const celebration = document.getElementById('celebration');
        
        emojis.forEach((emoji, index) => {
            setTimeout(() => {
                celebration.textContent = emoji;
                celebration.style.animation = 'none';
                setTimeout(() => {
                    celebration.style.animation = 'celebrate 0.6s ease-out';
                }, 10);
            }, index * 150);
        });
        
        // 创建粒子爆炸效果
        this.createParticleExplosion();
    }

    // ============================================
    // 创建粒子爆炸效果
    // ============================================
    createParticleExplosion() {
        const colors = ['#ff6b9d', '#00d4ff', '#ffd93d', '#6bcf7f', '#c44569'];
        const particleCount = 20;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.style.position = 'fixed';
            particle.style.left = '50%';
            particle.style.top = '50%';
            particle.style.width = '10px';
            particle.style.height = '10px';
            particle.style.borderRadius = '50%';
            particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            particle.style.pointerEvents = 'none';
            particle.style.zIndex = '300';
            
            const angle = (Math.PI * 2 * i) / particleCount;
            const velocity = 200 + Math.random() * 100;
            const tx = Math.cos(angle) * velocity;
            const ty = Math.sin(angle) * velocity;
            
            particle.style.animation = `particleExplosion 0.8s ease-out forwards`;
            particle.style.setProperty('--tx', tx + 'px');
            particle.style.setProperty('--ty', ty + 'px');
            
            document.body.appendChild(particle);
            
            setTimeout(() => {
                particle.remove();
            }, 800);
        }
    }

    // ============================================
    // 显示庆祝动画
    // ============================================
    showCelebration(emoji) {
        const celebration = document.getElementById('celebration');
        celebration.textContent = emoji;
        celebration.style.animation = 'none';
        setTimeout(() => {
            celebration.style.animation = 'celebrate 1s ease-out';
        }, 10);
    }

    // ============================================
    // 获取单词数据库
    // ============================================
    getWordDatabase() {
        return [
            { word: 'cat', translation: '猫', emoji: 'https://em-content.zobj.net/source/twitter/376/cat-face_1f431.png' },
            { word: 'dog', translation: '狗', emoji: 'https://em-content.zobj.net/source/twitter/376/dog-face_1f436.png' },
            { word: 'bird', translation: '鸟', emoji: 'https://em-content.zobj.net/source/twitter/376/bird_1f426.png' },
            { word: 'fish', translation: '鱼', emoji: 'https://em-content.zobj.net/source/twitter/376/fish_1f41f.png' },
            { word: 'apple', translation: '苹果', emoji: 'https://em-content.zobj.net/source/twitter/376/red-apple_1f34e.png' },
            { word: 'banana', translation: '香蕉', emoji: 'https://em-content.zobj.net/source/twitter/376/banana_1f34c.png' },
            { word: 'car', translation: '汽车', emoji: 'https://em-content.zobj.net/source/twitter/376/automobile_1f697.png' },
            { word: 'house', translation: '房子', emoji: 'https://em-content.zobj.net/source/twitter/376/house_1f3e0.png' },
            { word: 'sun', translation: '太阳', emoji: 'https://em-content.zobj.net/source/twitter/376/sun_2600-fe0f.png' },
            { word: 'moon', translation: '月亮', emoji: 'https://em-content.zobj.net/source/twitter/376/crescent-moon_1f319.png' },
            { word: 'star', translation: '星星', emoji: 'https://em-content.zobj.net/source/twitter/376/star_2b50.png' },
            { word: 'heart', translation: '心', emoji: 'https://em-content.zobj.net/source/twitter/376/red-heart_2764-fe0f.png' }
        ];
    }

    // ============================================
    // 创建游戏卡片
    // ============================================
    createCards() {
        const database = this.getWordDatabase();
        const selectedWords = this.shuffleArray(database).slice(0, 8);
        
        this.cards = [];
        
        selectedWords.forEach(item => {
            this.cards.push({
                type: 'word',
                word: item.word,
                display: item.word,
                translation: item.translation
            });
            
            this.cards.push({
                type: 'image',
                word: item.word,
                display: item.emoji,
                translation: item.translation
            });
        });
        
        // 先打乱一次
        this.cards = this.shuffleArray(this.cards);
        
        // 输出初始卡片信息用于调试
        console.log('初始卡片列表：', this.cards.map((c, i) => `${i}:${c.type}:${c.word}`).join(', '));
        
        // 循环打乱直到找到可配对的初始布局
        let hasValidLayout = false;
        let attempts = 0;
        const maxAttempts = 100;
        
        while (!hasValidLayout && attempts < maxAttempts) {
            hasValidLayout = this.checkInitialLayout();
            if (!hasValidLayout) {
                this.cards = this.shuffleArray(this.cards);
                attempts++;
            } else {
                break;
            }
        }
        
        console.log(`初始布局尝试次数: ${attempts}, 是否找到可配对布局: ${hasValidLayout}`);
        
        // 如果100次尝试后仍无法找到可配对布局，强制创建一个
        if (!hasValidLayout) {
            console.log('强制创建保证可配对的布局...');
            this.createGuaranteedLayout();
            // 验证强制创建的布局
            const verified = this.checkInitialLayout();
            console.log(`强制布局验证结果: ${verified}`);
            if (!verified) {
                console.error('严重错误：强制创建的布局仍然无法配对！');
                console.log('最终卡片列表：', this.cards.map((c, i) => `${i}:${c.type}:${c.word}`).join(', '));
            }
        }
        
        const gameBoard = document.getElementById('gameBoard');
        gameBoard.innerHTML = '';
        
        this.cards.forEach((card, index) => {
            const cardElement = document.createElement('div');
            cardElement.className = 'card';
            cardElement.dataset.index = index;
            
            if (card.type === 'image') {
                // 如果是URL，加载图片
                if (card.display.startsWith('http')) {
                    const img = document.createElement('img');
                    img.src = card.display;
                    img.style.width = '100px';
                    img.style.height = '100px';
                    img.style.objectFit = 'contain';
                    cardElement.appendChild(img);
                } else {
                    // 否则显示emoji
                    cardElement.innerHTML = `
                        <div class="card-emoji">${card.display}</div>
                    `;
                }
            } else {
                cardElement.innerHTML = `
                    <div class="card-text" style="font-size: 32px;">${card.display}</div>
                `;
            }
            
            gameBoard.appendChild(cardElement);
        });
    }

    // ============================================
    // 检查初始布局是否可配对
    // ============================================
    checkInitialLayout() {
        let foundPairs = [];
        
        for (let i = 0; i < this.cards.length; i++) {
            const card1 = this.cards[i];
            const neighbors = this.getNeighborIndicesForPosition(i);
            
            for (const neighborIdx of neighbors) {
                const card2 = this.cards[neighborIdx];
                
                if ((card1.type === 'word' && card2.type === 'image' && card1.word === card2.word) ||
                    (card1.type === 'image' && card2.type === 'word' && card1.word === card2.word)) {
                    foundPairs.push(`位置${i}(${card1.type}:${card1.word}) 和 位置${neighborIdx}(${card2.type}:${card2.word})`);
                }
            }
        }
        
        if (foundPairs.length > 0) {
            console.log(`找到${foundPairs.length}对可配对的相邻卡片:`, foundPairs.join('; '));
            return true;
        } else {
            console.warn('警告：当前布局没有可配对的相邻卡片！');
            return false;
        }
    }

    // ============================================
    // 获取指定位置的相邻索引（基于cards数组）
    // ============================================
    getNeighborIndicesForPosition(position) {
        const gridSize = 4;
        const row = Math.floor(position / gridSize);
        const col = position % gridSize;
        const neighbors = [];
        
        // 上
        if (row > 0) neighbors.push(position - gridSize);
        // 下
        if (row < gridSize - 1) neighbors.push(position + gridSize);
        // 左
        if (col > 0) neighbors.push(position - 1);
        // 右
        if (col < gridSize - 1) neighbors.push(position + 1);
        
        return neighbors;
    }

    // ============================================
    // 创建保证可配对的布局
    // ============================================
    createGuaranteedLayout() {
        // 找到第一对可配对的卡片（一个单词和一个图片）
        let wordCard = null;
        let imageCard = null;
        let wordIndex = -1;
        let imageIndex = -1;
        
        for (let i = 0; i < this.cards.length; i++) {
            if (this.cards[i].type === 'word' && !wordCard) {
                wordCard = this.cards[i];
                wordIndex = i;
                const word = wordCard.word;
                
                // 找到对应的图片
                for (let j = 0; j < this.cards.length; j++) {
                    if (this.cards[j].type === 'image' && this.cards[j].word === word) {
                        imageCard = this.cards[j];
                        imageIndex = j;
                        break;
                    }
                }
                
                if (imageCard) break;
            }
        }
        
        if (wordCard && imageCard) {
            console.log(`强制布局：将 ${wordCard.word}(word) 和 ${imageCard.word}(image) 放在位置0和1`);
            console.log(`交换前 - 位置0: ${this.cards[0].type}:${this.cards[0].word}, 位置1: ${this.cards[1].type}:${this.cards[1].word}`);
            console.log(`wordIndex: ${wordIndex}, imageIndex: ${imageIndex}`);
            
            // 创建新数组来避免引用问题
            const newCards = [...this.cards];
            
            // 将单词卡片放在位置0
            newCards[0] = { ...wordCard };
            newCards[wordIndex] = { ...this.cards[0] };
            
            // 更新imageIndex（如果它指向位置0）
            let actualImageIndex = imageIndex;
            if (imageIndex === 0) {
                actualImageIndex = wordIndex;
            }
            
            // 将图片卡片放在位置1（水平相邻）
            const cardAt1 = newCards[1];
            newCards[1] = { ...imageCard };
            newCards[actualImageIndex] = { ...cardAt1 };
            
            this.cards = newCards;
            
            console.log(`交换后 - 位置0: ${this.cards[0].type}:${this.cards[0].word}, 位置1: ${this.cards[1].type}:${this.cards[1].word}`);
            console.log('强制布局完成：位置0和位置1现在是可配对的相邻卡片');
        } else {
            console.error('错误：无法找到可配对的单词和图片卡片！');
        }
    }

    // ============================================
    // 洗牌算法
    // ============================================
    shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

    // ============================================
    // 开始游戏
    // ============================================
    startGame() {
        this.gameState = 'playing';
        this.matchedPairs = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.selectedCards = [];
        
        document.getElementById('startScreen').classList.add('hidden');
        document.getElementById('gameScreen').classList.remove('hidden');
        document.getElementById('resultScreen').classList.add('hidden');
        document.getElementById('backToHomeBtn').style.display = 'block';
        
        // 如果摄像头已停止，重新启动（但不重新初始化MediaPipe）
        if (this.camera && !this.videoStream) {
            console.log('重新启动摄像头...');
            this.camera.start()
                .then(() => {
                    console.log('摄像头重新启动成功');
                    return navigator.mediaDevices.getUserMedia({ video: true });
                })
                .then(stream => {
                    this.videoStream = stream;
                    console.log('视频流已恢复');
                })
                .catch(err => {
                    console.error('摄像头重启失败:', err);
                });
        } else if (!this.camera || !this.hands) {
            // 只在首次启动时初始化MediaPipe
            console.log('首次启动，初始化MediaPipe...');
            this.initMediaPipe();
        }
        
        this.createCards();
        this.startTimer();
        this.playBackgroundMusic();
        this.startInactivityCheck();
        
        document.getElementById('matched').textContent = '0';
        document.getElementById('combo').textContent = '0';
    }

    // ============================================
    // 开始计时器
    // ============================================
    startTimer() {
        this.startTime = Date.now();
        
        this.timerInterval = setInterval(() => {
            const elapsed = Date.now() - this.startTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            
            document.getElementById('timer').textContent = 
                `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }, 100);
    }

    // ============================================
    // 结束游戏
    // ============================================
    endGame() {
        this.gameState = 'result';
        clearInterval(this.timerInterval);
        this.stopBackgroundMusic();
        this.stopInactivityCheck();
        document.getElementById('backToHomeBtn').style.display = 'none';
        
        const elapsed = Date.now() - this.startTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        document.getElementById('finalTime').textContent = timeString;
        document.getElementById('finalMatched').textContent = this.matchedPairs;
        document.getElementById('finalCombo').textContent = this.maxCombo;
        
        document.getElementById('gameScreen').classList.add('hidden');
        document.getElementById('resultScreen').classList.remove('hidden');
        
        this.playSound(523, 0.2, 'success');
        setTimeout(() => this.playSound(659, 0.2, 'success'), 200);
        setTimeout(() => this.playSound(784, 0.3, 'success'), 400);
    }

    // ============================================
    // 重新开始游戏
    // ============================================
    restartGame() {
        this.stopBackgroundMusic();
        this.startGame();
    }

    // ============================================
    // 返回开始界面
    // ============================================
    backToStart() {
        this.gameState = 'start';
        this.stopBackgroundMusic();
        this.stopInactivityCheck();
        this.stopCamera();
        document.getElementById('backToHomeBtn').style.display = 'none';
        
        document.getElementById('startScreen').classList.remove('hidden');
        document.getElementById('gameScreen').classList.add('hidden');
        document.getElementById('resultScreen').classList.add('hidden');
    }

    // ============================================
    // 退出游戏
    // ============================================
    exitGame() {
        // 显示确认对话框
        if (confirm('确定要退出游戏吗？这将关闭摄像头。')) {
            // 停止所有音乐
            this.stopBackgroundMusic();
            
            // 停止无操作检测
            this.stopInactivityCheck();
            
            // 使用stopCamera方法，保持MediaPipe实例以便重新开始
            this.stopCamera();
            
            // 清理定时器
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
            }
            
            // 显示退出消息
            alert('游戏已退出。感谢游玩！🎮');
            
            console.log('游戏已退出，摄像头已关闭');
        }
    }

    // ============================================
    // 从游戏界面返回主页
    // ============================================
    backToStartFromGame() {
        this.stopBackgroundMusic();
        this.stopInactivityCheck();
        this.stopCamera();
        this.gameState = 'start';
        document.getElementById('backToHomeBtn').style.display = 'none';
        
        document.getElementById('startScreen').classList.remove('hidden');
        document.getElementById('gameScreen').classList.add('hidden');
        document.getElementById('resultScreen').classList.add('hidden');
    }

    // ============================================
    // 停止摄像头（但保持MediaPipe实例运行）
    // ============================================
    stopCamera() {
        if (this.camera) {
            this.camera.stop();
            // 不清空camera引用，保持实例
        }
        
        // 不关闭hands实例，保持MediaPipe运行
        
        if (this.videoStream) {
            this.videoStream.getTracks().forEach(track => {
                track.stop();
            });
            this.videoStream = null;
        }
        
        if (this.video) {
            this.video.srcObject = null;
        }
        
        console.log('摄像头已停止（MediaPipe保持运行）');
    }

    // ============================================
    // 开始无操作检测
    // ============================================
    startInactivityCheck() {
        this.lastActionTime = Date.now();
        
        if (this.inactivityCheckInterval) {
            clearInterval(this.inactivityCheckInterval);
        }
        
        this.inactivityCheckInterval = setInterval(() => {
            const now = Date.now();
            const inactiveTime = now - this.lastActionTime;
            
            // 1分钟 = 60000毫秒
            if (inactiveTime >= 60000 && this.gameState === 'playing') {
                this.showHintDialog();
                this.stopInactivityCheck();
            }
        }, 5000); // 每5秒检查一次
    }

    // ============================================
    // 停止无操作检测
    // ============================================
    stopInactivityCheck() {
        if (this.inactivityCheckInterval) {
            clearInterval(this.inactivityCheckInterval);
            this.inactivityCheckInterval = null;
        }
    }

    // ============================================
    // 重置无操作计时器
    // ============================================
    resetInactivityTimer() {
        this.lastActionTime = Date.now();
    }

    // ============================================
    // 显示提示对话框
    // ============================================
    showHintDialog() {
        document.getElementById('hintDialog').style.display = 'block';
    }

    // ============================================
    // 隐藏提示对话框
    // ============================================
    hideHintDialog() {
        document.getElementById('hintDialog').style.display = 'none';
    }

    // ============================================
    // 显示提示（高亮可配对的卡片）
    // ============================================
    showHint() {
        const gameBoard = document.getElementById('gameBoard');
        const cardElements = Array.from(gameBoard.children).filter(el => 
            el.style.display !== 'none' && !el.classList.contains('matched')
        );
        
        console.log(`提示功能：查找可配对的卡片，剩余卡片数量: ${cardElements.length}`);
        
        // 使用Grid中的实际显示位置来判断相邻关系
        for (let i = 0; i < cardElements.length; i++) {
            const card1Index = parseInt(cardElements[i].dataset.index);
            const card1 = this.cards[card1Index];
            
            if (!card1) {
                console.warn(`提示功能：卡片${i}的数据为空`);
                continue;
            }
            
            // 获取在Grid中的相邻位置（基于剩余卡片的实际显示位置）
            const neighbors = this.getNeighborIndicesInGrid(i, cardElements.length);
            
            for (const neighborPos of neighbors) {
                if (neighborPos < cardElements.length) {
                    const card2Index = parseInt(cardElements[neighborPos].dataset.index);
                    const card2 = this.cards[card2Index];
                    
                    if (!card2) {
                        console.warn(`提示功能：相邻卡片${neighborPos}的数据为空`);
                        continue;
                    }
                    
                    if ((card1.type === 'word' && card2.type === 'image' && card1.word === card2.word) ||
                        (card1.type === 'image' && card2.type === 'word' && card1.word === card2.word)) {
                        // 找到可配对的卡片，添加提示动画
                        console.log(`提示功能：找到可配对的卡片 - Grid位置${i}[原始${card1Index}](${card1.type}:${card1.word}) 和 Grid位置${neighborPos}[原始${card2Index}](${card2.type}:${card2.word})`);
                        
                        cardElements[i].classList.add('hint-card');
                        cardElements[neighborPos].classList.add('hint-card');
                        
                        // 3秒后移除提示
                        setTimeout(() => {
                            cardElements[i].classList.remove('hint-card');
                            cardElements[neighborPos].classList.remove('hint-card');
                        }, 3000);
                        
                        return;
                    }
                }
            }
        }
        
        console.warn('提示功能：未找到可配对的相邻卡片');
    }
}

// ============================================
// 创建游戏实例
// ============================================
let game;

// 等待DOM加载完成后再创建游戏实例
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        game = new MatchingGame();
    });
} else {
    game = new MatchingGame();
}
