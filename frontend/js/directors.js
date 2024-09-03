import { fetchMoviesAndDirectors} from './movies.js';

export function addDirector(event) {
    event.preventDefault();

    const name = document.getElementById('director-name').value;
    const jwtToken = localStorage.getItem('jwtToken'); // Retrieve the token

    fetch('http://localhost:3000/directors', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}` // Include the token in the headers
        },
        body: JSON.stringify({ name }),
    })
    .then(response => response.json())
    .then(data => {
        console.log('Director added:', data);
        fetchMoviesAndDirectors(jwtToken); // Pass the token here as well
    })
    .catch(error => console.error('Error adding director:', error));
}

export function deleteDirector(id) {
    const jwtToken = localStorage.getItem('jwtToken'); // Retrieve the token

    fetch(`http://localhost:3000/directors/${id}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${jwtToken}`, // Include the token in the headers
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
        console.log(`Director with ID ${id} deleted`, data);
        document.getElementById(`director-${id}`).remove();
    })
    .catch(error => console.error('Error deleting director:', error));
}

