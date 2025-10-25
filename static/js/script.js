document.addEventListener('DOMContentLoaded', () => {

    // --- Firebase Configuration ---
    // !!! MUKKIYAM: Ithula unga Firebase project-oda config-a podunga !!!
    const firebaseConfig = {
        apiKey: "AIzaSy...YOUR_API_KEY", // Neenga correct-ah potuteenga
        authDomain: "murugesan-df96e.firebaseapp.com",
        projectId: "murugesan-df96e",
        storageBucket: "murugesan-df96e.appspot.com",
        messagingSenderId: "63630703732",
        appId: "1:63630703732:web:dddc...",
        measurementId: "G-GN1YHRZ901"
    };

    // --- Firebase Initialize ---
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();

    // --- Backend API URL ---
    const API_URL = 'http://127.0.0.1:5000'; // Namma Python Flask Server

    // --- Element References ---
    const authContainer = document.getElementById('auth-container');
    const appContainer = document.getElementById('app-container');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const authToggleLink = document.getElementById('auth-toggle-link');
    const authTitle = document.getElementById('auth-title');
    const toggleText = document.getElementById('toggle-text');
    const authError = document.getElementById('auth-error');
    const logoutBtn = document.getElementById('logout-btn');
    const userEmailSpan = document.getElementById('user-email');

    // App Grids
    const moviesGrid = document.getElementById('movies-grid');
    const musicGrid = document.getElementById('music-grid');
    const recommendationsGrid = document.getElementById('recommendations-grid');
    
    let currentUser = null;
    let userLikes = new Set(); // User-oda likes-a store panna oru set

    // --- 1. Authentication Logic ---

    // Check if user is already logged in
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            userEmailSpan.textContent = user.email;
            authContainer.style.display = 'none';
            appContainer.style.display = 'block';
            
            // User login aanathum, avanga likes-a fetch pannanum
            loadUserLikesAndInitialData();
            
            // Scroll reveal animations
            revealAnimations();
        } else {
            currentUser = null;
            authContainer.style.display = 'flex';
            appContainer.style.display = 'none';
        }
    });

    // Login Form
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        auth.signInWithEmailAndPassword(email, password)
            .catch((error) => {
                showAuthError(error.message);
            });
    });

    // Signup Form
    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        
        auth.createUserWithEmailAndPassword(email, password)
            .catch((error) => {
                showAuthError(error.message);
            });
    });

    // Logout Button
    logoutBtn.addEventListener('click', () => {
        auth.signOut();
    });

    // Toggle between Login and Signup
    authToggleLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (signupForm.style.display === 'none') {
            loginForm.style.display = 'none';
            signupForm.style.display = 'block';
            authTitle.textContent = 'Sign Up';
            toggleText.textContent = 'Already have an account?';
            authToggleLink.textContent = 'Login';
        } else {
            loginForm.style.display = 'block';
            signupForm.style.display = 'none';
            authTitle.textContent = 'Login';
            toggleText.textContent = 'Need an account?';
            authToggleLink.textContent = 'Sign Up';
        }
    });

    function showAuthError(message) {
        authError.textContent = message;
        authError.style.display = 'block';
    }

    // --- 2. Data Loading & Rendering ---

    async function loadUserLikesAndInitialData() {
        if (!currentUser) return;

        // 1. Fetch user's likes from Firestore
        userLikes.clear();
        const likesSnapshot = await db.collection('users').doc(currentUser.uid).collection('likes').get();
        likesSnapshot.forEach(doc => {
            userLikes.add(doc.id);
        });

        // 2. Fetch all items (movies, music) from our Python backend
        try {
            const response = await fetch(`${API_URL}/get-all-items`);
            const data = await response.json();
            
            renderMediaGrid(moviesGrid, data.movies, 'movie');
            renderMediaGrid(musicGrid, data.music, 'music');

            // 3. Fetch recommendations
            fetchRecommendations();

        } catch (error) {
            console.error('Error fetching all items:', error);
        }
    }

    // Render panna oru helper function
    function renderMediaGrid(gridElement, items, type) {
        gridElement.innerHTML = '';
        for (const [id, item] of Object.entries(items)) {
            const isLiked = userLikes.has(id);
            const card = document.createElement('div');
            card.className = 'media-card';
            card.innerHTML = `
                <img src="${item.poster}" alt="${item.title}" class="card-poster">
                <div class="card-body">
                    <h3 class="card-title">${item.title}</h3>
                    <p class="card-subtitle">${type === 'movie' ? 'Movie' : item.album}</p>
                </div>
                <button class="like-btn ${isLiked ? 'liked' : ''}" data-id="${id}" data-type="${type}">
                    <i class="fas fa-heart"></i>
                </button>
            `;
            gridElement.appendChild(card);
        }
    }

    // --- 3. Like/Unlike Logic (Real-time Firestore) ---

    // Event delegation for like buttons
    document.addEventListener('click', (e) => {
        const likeBtn = e.target.closest('.like-btn');
        if (likeBtn) {
            const itemId = likeBtn.dataset.id;
            const itemType = likeBtn.dataset.type;
            toggleLike(itemId, itemType, likeBtn);
        }
    });

    async function toggleLike(itemId, itemType, likeBtn) {
        if (!currentUser) return;

        const likeRef = db.collection('users').doc(currentUser.uid).collection('likes').doc(itemId);
        
        if (userLikes.has(itemId)) {
            // --- Unlike ---
            await likeRef.delete();
            userLikes.delete(itemId);
            likeBtn.classList.remove('liked');
        } else {
            // --- Like ---
            await likeRef.set({ type: itemType, likedAt: new Date() });
            userLikes.add(itemId);
            likeBtn.classList.add('liked');
        }
        
        // User like panna odane, puthu recommendations fetch pannanum
        fetchRecommendations();
    }

    // --- 4. Recommendation Logic ---

    async function fetchRecommendations() {
        if (userLikes.size === 0) {
            recommendationsGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-heart-crack"></i>
                    <p>Like some movies or music to get personalized recommendations!</p>
                </div>
            `;
            return;
        }

        try {
            const response = await fetch(`${API_URL}/recommend`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ liked_ids: Array.from(userLikes) })
            });
            
            const data = await response.json();
            
            // Render recommendations
            renderRecommendations(data.recommendations);

        } catch (error) {
            console.error('Error fetching recommendations:', error);
        }
    }

    function renderRecommendations(recommendations) {
        recommendationsGrid.innerHTML = '';
        
        if (recommendations.length === 0) {
             recommendationsGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-magic"></i>
                    <p>Keep liking! We're finding new items that match your taste.</p>
                </div>
            `;
            return;
        }

        recommendations.forEach(item => {
            const isLiked = userLikes.has(item.id);
            const type = item.id.startsWith('m') ? 'movie' : 'music';
            const card = document.createElement('div');
            card.className = 'media-card';
            card.innerHTML = `
                <img src="${item.poster}" alt="${item.title}" class="card-poster">
                <div class="card-body">
                    <h3 class="card-title">${item.title}</h3>
                    <p class="card-subtitle">${type === 'movie' ? 'Movie' : item.album}</p>
                </div>
                <button class="like-btn ${isLiked ? 'liked' : ''}" data-id="${item.id}" data-type="${type}">
                    <i class="fas fa-heart"></i>
                </button>
            `;
            recommendationsGrid.appendChild(card);
        });
    }

    // --- 5. Animations ---
    function revealAnimations() {
        const reveals = document.querySelectorAll('.reveal-up');
        const revealOnScroll = () => {
            reveals.forEach(element => {
                const elementTop = element.getBoundingClientRect().top;
                const elementVisible = 100;
                if (elementTop < window.innerHeight - elementVisible) {
                    element.classList.add('active');
                }
            });
        };
        window.addEventListener('scroll', revealOnScroll);
        revealOnScroll(); // Initial check
    }
});