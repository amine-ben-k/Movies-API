import { loginUser, registerUser } from './auth.js';
import { fetchMoviesAndDirectors, addMovie, deleteMovie } from './movies.js';
import { addDirector, deleteDirector } from './directors.js';
import {  populateMoviesAndDirectors } from './rating.js';
import { handleSearch } from './search.js';

document.addEventListener('DOMContentLoaded', () => {
    const jwtToken = localStorage.getItem('jwtToken');


    if (jwtToken) {
        fetchMoviesAndDirectors(jwtToken);
    }

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', loginUser);
    }

    const movieForm = document.getElementById('movie-form');
    if (movieForm) {
        movieForm.addEventListener('submit', addMovie);
    }

    const directorForm = document.getElementById('director-form');
    if (directorForm) {
        directorForm.addEventListener('submit', addDirector);
    }

    document.getElementById('search-form').addEventListener('submit', handleSearch);
});
