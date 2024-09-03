

export async function handleSearch(event) {
    event.preventDefault();
    const name = document.getElementById('search-director').value;
    const token = localStorage.getItem('jwtToken');

    try {
        const response = await fetch(`http://localhost:3000/search?name=${encodeURIComponent(name)}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const results = await response.json();
        const resultsDiv = document.getElementById('search-results');
        resultsDiv.innerHTML = '';

        if (results.length > 0) {
            const ul = document.createElement('ul');
            results.forEach(movie => {
                const li = document.createElement('li');
                li.textContent = `${movie.id}: ${movie.title}, and its rating is ${movie.rating}`;
                ul.appendChild(li);
            });
            resultsDiv.appendChild(ul);
        } else {
            resultsDiv.textContent = 'No results found';
        }
    } catch (err) {
        document.getElementById('search-results').textContent = 'Error fetching results';
        console.error(err);
    }
}
