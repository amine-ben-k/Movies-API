import { fetchMoviesAndDirectors, addMovie, deleteMovie } from './movies.js';
import { deleteDirector } from './directors.js';
// Function to fetch and display all ratings

function updateStars(container, rating) {
    const stars = container.querySelectorAll('.star');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('selected');
        } else {
            star.classList.remove('selected');
        }
    });
    if (rating > 0) {
        container.querySelector('.single-star').classList.add('rated');
    } else {
        container.querySelector('.single-star').classList.remove('rated');
    }
}

export async function fetchAndDisplayRatings() {
    const token = localStorage.getItem('jwtToken');

    try {
        const response = await fetch('http://localhost:3000/ratings', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch ratings: ' + response.statusText);
        }

        return await response.json(); // Return the ratings

    } catch (error) {
        console.error('Error fetching ratings:', error);
        return []; // Return an empty array in case of an error
    }
}

async function addRating(movieId, rating) {
    const token = localStorage.getItem('jwtToken');

    if (!token) {
        console.error('User is not authenticated');
        return;
    }

    try {
        const response = await fetch(`http://localhost:3000/movies/${movieId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Include the token in the request header
            },
            body: JSON.stringify({ rating })
        });

        if (response.ok) {
            const result = await response.json();
            return result.averageRating;
        } else if (response.status === 401) {
            console.error('Unauthorized: Please log in again.');
        } else {
            console.error('Failed to update rating:', response.statusText);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Populate movies and directors
export async function populateMoviesAndDirectors(movies, directors) {
    const movieList = document.getElementById('movie-list');
    const directorList = document.getElementById('director-list');

    movieList.innerHTML = ''; // Clear previous content
    directorList.innerHTML = ''; // Clear previous content

    // Fetch and process ratings
    const ratings = await fetchAndDisplayRatings();

    // Create a map for quick lookup of ratings by movie ID
    const ratingsMap = ratings.reduce((acc, rating) => {
        acc[rating.movie_id] = rating.rating;
        return acc;
    }, {});

    // Sort movies based on their ratings
    movies.sort((a, b) => {
        const ratingA = ratingsMap[a.id] || 0;
        const ratingB = ratingsMap[b.id] || 0;
        return ratingB - ratingA; // Descending order
    });

    movies.forEach(movie => {
        const li = document.createElement('li');
        li.id = `movie-${movie.id}`;
        li.textContent = `${movie.title} `;

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', () => deleteMovie(movie.id));

        const ratingContainer = document.createElement('div');
        ratingContainer.className = 'rating-container';

        const singleStar = document.createElement('div');
        singleStar.className = 'single-star';
        singleStar.textContent = '★';
        ratingContainer.appendChild(singleStar);

        const starGroup = document.createElement('div');
        starGroup.className = 'star-group';
        for (let i = 0; i < 5; i++) {
            const star = document.createElement('span');
            star.className = 'star';
            star.innerHTML = '&#9733;';
            star.dataset.rating = i + 1;
            starGroup.appendChild(star);
        }
        ratingContainer.appendChild(starGroup);

        const ratingDisplay = document.createElement('span');
        ratingDisplay.className = 'current-rating';
        ratingDisplay.textContent = `Rating: ${ratingsMap[movie.id] || 'No rating yet'}`;

        // Update stars based on the rating
        updateStars(ratingContainer, ratingsMap[movie.id] || 0);

        ratingContainer.addEventListener('mouseover', () => {
            starGroup.style.display = 'flex';
        });

        ratingContainer.addEventListener('mouseout', () => {
            starGroup.style.display = 'none';
        });

        starGroup.addEventListener('click', async (event) => {
            const rating = event.target.dataset.rating;
            const averageRating = await addRating(movie.id, rating);
            if (averageRating !== undefined) {
                ratingsMap[movie.id] = averageRating;
                updateStars(ratingContainer, averageRating);
                ratingDisplay.textContent = `Rating: ${averageRating}`;
            }
            const stars = starGroup.querySelectorAll('.star');
            stars.forEach((star, index) => {
                if (index < rating) {
                    star.classList.add('hover');
                } else {
                    star.classList.remove('hover');
                }
            });
            alert("your rating got submitted")
            location.reload()
        });

        ratingContainer.appendChild(ratingDisplay);
        if (localStorage.getItem("userRole") === "admin") {
            li.appendChild(deleteButton);
        }
        if (localStorage.getItem("userRole") === "user") {
            li.appendChild(ratingContainer);
        }
        movieList.appendChild(li);
    });

    directors.forEach(director => {
        const li = document.createElement('li');
        li.id = `director-${director.id}`;
        li.textContent = `${director.name} (ID: ${director.id})`;

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', () => deleteDirector(director.id));

        if (localStorage.getItem("userRole") === "admin") {
            li.appendChild(deleteButton);
        }
        directorList.appendChild(li);
    });
}

export function findDirectorName(directorId, directors) {
    const director = directors.find(d => d.id === directorId);
    return director ? director.name : 'Unknown Director';
}
