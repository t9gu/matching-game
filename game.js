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
    // 初始化MediaPipe
    // ============================================
    initMediaPipe() {
        this.video = document.getElementById('video');
        
        this.hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });
        
        this.hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.7
        });
        
        this.hands.onResults((results) => this.onHandsResults(results));
        
        this.camera = new Camera(this.video, {
            onFrame: async () => {
                await this.hands.send({ image: this.video });
            },
            width: 1280,
            height: 720
        });
        
        this.camera.start().then(() => {
            document.getElementById('loading').style.display = 'none';
        });
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
                this.fingerTip = {
                    x: (1 - indexFingerTip.x) * this.handCanvas.width,
                    y: indexFingerTip.y * this.handCanvas.height
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
        
        const cards = document.querySelectorAll('.card:not(.matched)');
        cards.forEach(card => {
            const rect = card.getBoundingClientRect();
            
            if (this.fingerTip.x >= rect.left && 
                this.fingerTip.x <= rect.right &&
                this.fingerTip.y >= rect.top && 
                this.fingerTip.y <= rect.bottom) {
                
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
        
        // 如果正在检查配对，不允许选择新卡片
        if (this.isCheckingMatch) return;
        if (this.selectedCards.length >= 2) return;
        if (this.selectedCards.some(c => c.index === cardIndex)) return;
        
        cardElement.classList.add('selected');
        this.selectedCards.push({ element: cardElement, data: card, index: cardIndex });
        
        this.playSound(440, 0.1, 'success');
        
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
        const remainingCards = this.cards.filter((card, index) => {
            const cardElement = document.querySelector(`.card[data-index="${index}"]`);
            return cardElement && cardElement.style.display !== 'none';
        });
        
        if (remainingCards.length === 0) return;
        
        // 检查是否存在可配对的相邻卡片
        const hasValidMatch = this.checkForValidMatches(remainingCards);
        
        if (!hasValidMatch) {
            // 没有可配对的相邻卡片，需要重新打乱
            this.reshuffleRemainingCards();
        }
    }

    // ============================================
    // 检查是否存在可配对的相邻卡片
    // ============================================
    checkForValidMatches(remainingCards) {
        const gameBoard = document.getElementById('gameBoard');
        const cardElements = Array.from(gameBoard.children).filter(el => el.style.display !== 'none');
        
        for (let i = 0; i < cardElements.length; i++) {
            const card1Index = parseInt(cardElements[i].dataset.index);
            const card1 = this.cards[card1Index];
            
            // 检查相邻的卡片（上下左右）
            const neighbors = this.getNeighborIndices(i, cardElements.length);
            
            for (const neighborPos of neighbors) {
                if (neighborPos < cardElements.length) {
                    const card2Index = parseInt(cardElements[neighborPos].dataset.index);
                    const card2 = this.cards[card2Index];
                    
                    // 检查是否可以配对
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
    }

    // ============================================
    // 检查剩余卡片布局是否可配对
    // ============================================
    checkRemainingCardsLayout(cardElements, tempCards) {
        for (let i = 0; i < cardElements.length; i++) {
            const card1Index = parseInt(cardElements[i].dataset.index);
            const card1 = tempCards[card1Index];
            
            // 计算在剩余卡片中的相邻位置
            const neighbors = this.getNeighborIndicesInRemaining(i, cardElements);
            
            for (const neighborPos of neighbors) {
                const card2Index = parseInt(cardElements[neighborPos].dataset.index);
                const card2 = tempCards[card2Index];
                
                if ((card1.type === 'word' && card2.type === 'image' && card1.word === card2.word) ||
                    (card1.type === 'image' && card2.type === 'word' && card1.word === card2.word)) {
                    return true;
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
        
        // 循环打乱直到找到可配对的初始布局
        let hasValidLayout = false;
        let attempts = 0;
        const maxAttempts = 100;
        
        while (!hasValidLayout && attempts < maxAttempts) {
            this.cards = this.shuffleArray(this.cards);
            hasValidLayout = this.checkInitialLayout();
            attempts++;
        }
        
        // 如果100次尝试后仍无法找到可配对布局，强制创建一个
        if (!hasValidLayout) {
            this.createGuaranteedLayout();
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
        for (let i = 0; i < this.cards.length; i++) {
            const card1 = this.cards[i];
            const neighbors = this.getNeighborIndicesForPosition(i);
            
            for (const neighborIdx of neighbors) {
                const card2 = this.cards[neighborIdx];
                
                if ((card1.type === 'word' && card2.type === 'image' && card1.word === card2.word) ||
                    (card1.type === 'image' && card2.type === 'word' && card1.word === card2.word)) {
                    return true;
                }
            }
        }
        
        return false;
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
        // 找到第一对可配对的卡片
        for (let i = 0; i < this.cards.length; i++) {
            if (this.cards[i].type === 'word') {
                const word = this.cards[i].word;
                
                // 找到对应的图片
                for (let j = 0; j < this.cards.length; j++) {
                    if (i !== j && this.cards[j].type === 'image' && this.cards[j].word === word) {
                        // 将这对卡片放在相邻位置（0和1）
                        const temp = this.cards[0];
                        this.cards[0] = this.cards[i];
                        this.cards[i] = temp;
                        
                        const temp2 = this.cards[1];
                        this.cards[1] = this.cards[j];
                        this.cards[j] = temp2;
                        
                        return;
                    }
                }
            }
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
        
        this.createCards();
        this.startTimer();
        this.playBackgroundMusic();
        
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
        
        document.getElementById('startScreen').classList.remove('hidden');
        document.getElementById('gameScreen').classList.add('hidden');
        document.getElementById('resultScreen').classList.add('hidden');
    }
}

// ============================================
// 创建游戏实例
// ============================================
const game = new MatchingGame();
