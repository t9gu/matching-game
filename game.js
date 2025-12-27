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
        
        this.init();
    }

    // ============================================
    // 初始化
    // ============================================
    init() {
        this.initAudio();
        this.initMediaPipe();
        this.setupCanvas();
    }

    // ============================================
    // 初始化音频
    // ============================================
    initAudio() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
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
                    x: indexFingerTip.x * this.handCanvas.width,
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
                startPoint.x * this.handCanvas.width,
                startPoint.y * this.handCanvas.height,
                endPoint.x * this.handCanvas.width,
                endPoint.y * this.handCanvas.height
            );
            gradient.addColorStop(0, '#0ff');
            gradient.addColorStop(0.5, '#f0f');
            gradient.addColorStop(1, '#ff0');
            
            this.handCtx.strokeStyle = gradient;
            this.handCtx.shadowColor = '#0ff';
            
            this.handCtx.beginPath();
            this.handCtx.moveTo(
                startPoint.x * this.handCanvas.width,
                startPoint.y * this.handCanvas.height
            );
            this.handCtx.lineTo(
                endPoint.x * this.handCanvas.width,
                endPoint.y * this.handCanvas.height
            );
            this.handCtx.stroke();
        });
        
        landmarks.forEach((landmark, index) => {
            const x = landmark.x * this.handCanvas.width;
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
        
        if (this.selectedCards.length >= 2) return;
        if (this.selectedCards.some(c => c.index === cardIndex)) return;
        
        cardElement.classList.add('selected');
        this.selectedCards.push({ element: cardElement, data: card, index: cardIndex });
        
        this.playSound(440, 0.1, 'success');
        
        if (this.selectedCards.length === 2) {
            setTimeout(() => this.checkMatch(), 500);
        }
    }

    // ============================================
    // 检查匹配
    // ============================================
    checkMatch() {
        const [card1, card2] = this.selectedCards;
        
        const isMatch = (card1.data.type === 'word' && card2.data.type === 'image' && card1.data.word === card2.data.word) ||
                       (card1.data.type === 'image' && card2.data.type === 'word' && card1.data.word === card2.data.word);
        
        if (isMatch) {
            card1.element.classList.add('matched');
            card2.element.classList.add('matched');
            
            this.matchedPairs++;
            this.combo++;
            this.maxCombo = Math.max(this.maxCombo, this.combo);
            
            this.playSound(523, 0.2, 'success');
            this.playSound(659, 0.2, 'success');
            this.playSound(784, 0.3, 'success');
            
            this.showCelebration('🎉');
            
            document.getElementById('matched').textContent = this.matchedPairs;
            document.getElementById('combo').textContent = this.combo;
            
            setTimeout(() => {
                card1.element.style.display = 'none';
                card2.element.style.display = 'none';
            }, 600);
            
            if (this.matchedPairs === this.totalPairs) {
                setTimeout(() => this.endGame(), 1000);
            }
        } else {
            this.combo = 0;
            document.getElementById('combo').textContent = this.combo;
            
            this.playSound(200, 0.3, 'error');
            
            setTimeout(() => {
                card1.element.classList.remove('selected');
                card2.element.classList.remove('selected');
            }, 800);
        }
        
        this.selectedCards = [];
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
            { word: 'cat', translation: '猫', emoji: '🐱' },
            { word: 'dog', translation: '狗', emoji: '🐶' },
            { word: 'bird', translation: '鸟', emoji: '🐦' },
            { word: 'fish', translation: '鱼', emoji: '🐟' },
            { word: 'apple', translation: '苹果', emoji: '🍎' },
            { word: 'banana', translation: '香蕉', emoji: '🍌' },
            { word: 'car', translation: '汽车', emoji: '🚗' },
            { word: 'house', translation: '房子', emoji: '🏠' },
            { word: 'sun', translation: '太阳', emoji: '☀️' },
            { word: 'moon', translation: '月亮', emoji: '🌙' },
            { word: 'star', translation: '星星', emoji: '⭐' },
            { word: 'heart', translation: '心', emoji: '❤️' }
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
        
        this.cards = this.shuffleArray(this.cards);
        
        const gameBoard = document.getElementById('gameBoard');
        gameBoard.innerHTML = '';
        
        this.cards.forEach((card, index) => {
            const cardElement = document.createElement('div');
            cardElement.className = 'card';
            cardElement.dataset.index = index;
            
            if (card.type === 'image') {
                cardElement.innerHTML = `
                    <div class="card-emoji">${card.display}</div>
                    <div class="card-text">${card.translation}</div>
                `;
            } else {
                cardElement.innerHTML = `
                    <div class="card-text" style="font-size: 28px; margin-top: 20px;">${card.display}</div>
                    <div class="card-text">${card.translation}</div>
                `;
            }
            
            gameBoard.appendChild(cardElement);
        });
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
        this.startGame();
    }

    // ============================================
    // 返回开始界面
    // ============================================
    backToStart() {
        this.gameState = 'start';
        
        document.getElementById('startScreen').classList.remove('hidden');
        document.getElementById('gameScreen').classList.add('hidden');
        document.getElementById('resultScreen').classList.add('hidden');
    }
}

// ============================================
// 创建游戏实例
// ============================================
const game = new MatchingGame();
