from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import json

app = Flask(__name__)
# CORS(app) allows your http://127.0.0.1:5500 (frontend) to talk to http://127.0.0.1:5000 (backend)
CORS(app)

# --- Namma Static Database (Real-time-la itha DB-la irunthu edupom, ippo prototype-kaga ingaye vechikalam) ---

# Tamil Movie Database
MOVIE_DB = {
    "m001": {"title": "Vikram", "poster": "https://upload.wikimedia.org/wikipedia/en/2/22/Vikram_film_poster.jpg", "tags": ["action", "thriller", "lokesh_kanagaraj", "kamal_haasan", "vijay_sethupathi", "fahadh_faasil"]},
    "m002": {"title": "Leo", "poster": "https://upload.wikimedia.org/wikipedia/en/7/76/Leo_2023_film_poster.jpg", "tags": ["action", "thriller", "lokesh_kanagaraj", "vijay", "sanjay_dutt"]},
    "m003": {"title": "Kaithi", "poster": "https://upload.wikimedia.org/wikipedia/en/thumb/4/41/Kaithi_poster.jpg/220px-Kaithi_poster.jpg", "tags": ["action", "thriller", "lokesh_kanagaraj", "karthi"]},
    "m004": {"title": "Enthiran", "poster": "https://upload.wikimedia.org/wikipedia/en/thumb/c/c0/Enthiran_poster.jpg/220px-Enthiran_poster.jpg", "tags": ["sci-fi", "action", "shankar", "rajinikanth", "aishwarya_rai"]},
    "m005": {"title": "Vada Chennai", "poster": "https://upload.wikimedia.org/wikipedia/en/thumb/a/a2/Vada_Chennai_poster.jpg/220px-Vada_Chennai_poster.jpg", "tags": ["gangster", "drama", "action", "vetrimaaran", "dhanush"]},
    "m006": {"title": "Asuran", "poster": "https://upload.wikimedia.org/wikipedia/en/thumb/7/7B/Asuran_poster.jpg/220px-Asuran_poster.jpg", "tags": ["drama", "action", "vetrimaaran", "dhanush"]},
    "m007": {"title": "96", "poster": "https://upload.wikimedia.org/wikipedia/en/thumb/6/66/96_film_poster.jpg/220px-96_film_poster.jpg", "tags": ["romance", "drama", "vijay_sethupathi", "trisha"]},
    "m008": {"title": "Soorarai Pottru", "poster": "https://upload.wikimedia.org/wikipedia/en/thumb/f/f2/Soorarai_Pottru_poster.jpg/220px-Soorarai_Pottru_poster.jpg", "tags": ["drama", "biography", "suriya", "sudha_kongara"]},
    "m009": {"title": "Mankatha", "poster": "https://upload.wikimedia.org/wikipedia/en/thumb/4/4c/Mankatha_poster.jpg/220px-Mankatha_poster.jpg", "tags": ["action", "thriller", "heist", "venkat_prabhu", "ajith_kumar"]},
    "m010": {"title": "Ayan", "poster": "https://upload.wikimedia.org/wikipedia/en/thumb/f/f6/Ayan_poster.jpg/220px-Ayan_poster.jpg", "tags": ["action", "thriller", "suriya", "kv_anand"]}
}

# Tamil Music Database
MUSIC_DB = {
    "s001": {"title": "Naa Ready", "album": "Leo", "poster": "https://upload.wikimedia.org/wikipedia/en/7/76/Leo_2023_film_poster.jpg", "tags": ["fast-beat", "kuthu", "anirudh", "vijay", "lokesh_kanagaraj"]},
    "s002": {"title": "Hukum", "album": "Jailer", "poster": "https://upload.wikimedia.org/wikipedia/en/thumb/1/11/Jailer_2023_film_poster.jpg/220px-Jailer_2023_film_poster.jpg", "tags": ["fast-beat", "mass", "anirudh", "rajinikanth", "superstar"]},
    "s003": {"title": "Why This Kolaveri Di", "album": "3", "poster": "https://upload.wikimedia.org/wikipedia/en/thumb/b/be/3_movie_poster.jpg/220px-3_movie_poster.jpg", "tags": ["soup-song", "folk", "anirudh", "dhanush"]},
    "s004": {"title": "Arabic Kuthu", "album": "Beast", "poster": "https://upload.wikimedia.org/wikipedia/en/thumb/1/18/Beast_film_poster.jpg/220px-Beast_film_poster.jpg", "tags": ["fast-beat", "kuthu", "anirudh", "vijay", "jonita_gandhi"]},
    "s005": {"title": "The Life of Ram", "album": "96", "poster": "https://upload.wikimedia.org/wikipedia/en/thumb/6/66/96_film_poster.jpg/220px-96_film_poster.jpg", "tags": ["melody", "soulful", "govind_vasantha", "pradeep_kumar"]},
    "s006": {"title": "Nenjukkul Peidhidum", "album": "Vaaranam Aayiram", "poster": "https://upload.wikimedia.org/wikipedia/en/thumb/9/91/Vaaranam_Aayiram.jpg/220px-Vaaranam_Aayiram.jpg", "tags": ["melody", "romance", "harris_jayaraj", "suriya", "gautham_menon"]},
    "s007": {"title": "Munbe Vaa", "album": "Sillunu Oru Kaadhal", "poster": "https://upload.wikimedia.org/wikipedia/en/thumb/5/5e/Sillunu_Oru_Kaadhal.jpg/220px-Sillunu_Oru_Kaadhal.jpg", "tags": ["melody", "romance", "ar_rahman", "suriya", "shreya_ghoshal"]},
    "s008": {"title": "Rowdy Baby", "album": "Maari 2", "poster": "https://upload.wikimedia.org/wikipedia/en/thumb/0/0e/Maari_2_poster.jpg/220px-Maari_2_poster.jpg", "tags": ["fast-beat", "kuthu", "yuvan_shankar_raja", "dhanush", "dhee"]},
}

# Merge both databases for easy lookup
FULL_DB = {**MOVIE_DB, **MUSIC_DB}


# --- PUTHU ROUTE (ITHU THAAN FIX) ---
@app.route('/')
def home():
    """Serves the main HTML page from the 'templates' folder."""
    return render_template('index.html')


@app.route('/get-all-items', methods=['GET'])
def get_all_items():
    """Frontend-kaga ella items-ayum anupurathu."""
    return jsonify({
        "movies": MOVIE_DB,
        "music": MUSIC_DB
    })


@app.route('/recommend', methods=['POST'])
def recommend():
    """Ithu thaan namma recommendation engine-oda core logic."""
    data = request.json
    liked_item_ids = data.get('liked_ids', []) # ['m001', 's005']
    
    if not liked_item_ids:
        return jsonify({"recommendations": []}) # User ethuvum like pannala-na, onnum illa.

    # 1. Unga "Like" panna items-oda ella tags-ayum orey set-la collect pannunga
    user_profile_tags = set()
    for item_id in liked_item_ids:
        if item_id in FULL_DB:
            user_profile_tags.update(FULL_DB[item_id]['tags'])
    
    # 2. Score calculate pannunga
    recommendation_scores = {}
    
    for item_id, item_details in FULL_DB.items():
        # User already like panna item-a marubadiyum recommend panna koodathu
        if item_id in liked_item_ids:
            continue
        
        # Intha item-oda tags-kum, user profile tags-kum evlo match iruku-nu paakalam
        item_tags = set(item_details['tags'])
        common_tags = user_profile_tags.intersection(item_tags)
        
        score = len(common_tags) # Simple-ah, common tags-oda count thaan score
        
        if score > 0:
            recommendation_scores[item_id] = score
            
    # 3. Score-a base panni sort pannunga (athigama irukurathu mudhalla)
    sorted_recommendations = sorted(recommendation_scores.items(), key=lambda item: item[1], reverse=True)
    
    # 4. Full item details-oda anupunga
    final_recommendations = []
    for item_id, score in sorted_recommendations:
        item_details = FULL_DB[item_id].copy()
        item_details['id'] = item_id
        item_details['match_score'] = score
        final_recommendations.append(item_details)
        
    return jsonify({"recommendations": final_recommendations})


if __name__ == '__main__':
    app.run(debug=True, port=5000)