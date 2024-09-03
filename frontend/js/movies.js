import { populateMoviesAndDirectors } from './rating.js';



export function fetchMoviesAndDirectors(jwtToken) {
    fetch('http://localhost:3000/movies', {
        headers: {
            'Authorization': `Bearer ${jwtToken}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Unauthorized');
        }
        return response.json();
    })
    .then(movies => {
        fetch('http://localhost:3000/directors', {
            headers: {
                'Authorization': `Bearer ${jwtToken}`
            }
        })
        .then(response => response.json())
        .then(directors => {
            populateMoviesAndDirectors(movies, directors);
        })
        .catch(error => console.error('Error fetching directors:', error));
    })
    .catch(error => {
        console.error('Error fetching movies:', error);
    });
}

export function addMovie(event) {
    event.preventDefault();

    const title = document.getElementById('title').value;
    const directorId = document.getElementById('director_id').value;

    const movieData = { title, director_id: parseInt(directorId) };

    fetch('http://localhost:3000/movies', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`
        },
        body: JSON.stringify(movieData),
    })
    .then(response => response.json())
    .then(data => {
        console.log('Movie added:', data);
        fetchMoviesAndDirectors(localStorage.getItem('jwtToken'))
    })
    .catch(error => console.error('Error adding movie:', error.message));
}

export function deleteMovie(id) {
    const jwtToken = localStorage.getItem('jwtToken');
    
    if (!jwtToken) {
        console.error('User is not authenticated');
        return;
    }

    fetch(`http://localhost:3000/movies/${id}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${jwtToken}`,
            'Content-Type': 'application/json' // Ensure the Content-Type is set if needed
        }
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(`Error ${response.status}: ${err.error || response.statusText}`);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log(`Movie with ID ${id} deleted`, data);
        document.getElementById(`movie-${id}`).remove();
    })
    .catch(error => console.error('Error deleting movie:', error));
}
