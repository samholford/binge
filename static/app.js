document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const searchResults = document.getElementById('search-results');
    const trackedShows = document.getElementById('tracked-shows');

    async function searchShows() {
        const query = searchInput.value;
        if (!query) return;

        const response = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });
        const results = await response.json();
        displaySearchResults(results);
    }

    function displaySearchResults(results) {
        searchResults.innerHTML = '';
        results.forEach(result => {
            const li = document.createElement('li');
            li.textContent = result.name;
            const addButton = document.createElement('button');
            addButton.textContent = 'Add';
            addButton.onclick = () => addShow(result);
            li.appendChild(addButton);
            searchResults.appendChild(li);
        });
    }

    async function addShow(show) {
        await fetch('/api/shows', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: show.name, tvdb_id: show.id })
        });
        loadTrackedShows();
    }

    async function checkShowStatus(tvdb_id) {
        await fetch(`/api/shows/${tvdb_id}`, {
            method: 'POST'
        });
        loadTrackedShows();
    }

    async function loadTrackedShows() {
        const response = await fetch('/api/shows');
        const shows = await response.json();
        trackedShows.innerHTML = '';
        shows.forEach(show => {
            const li = document.createElement('li');
            li.textContent = `${show.name} - ${show.bingeable ? 'Bingeable!' : 'Airing'}`;
            const checkButton = document.createElement('button');
            checkButton.textContent = 'Check Status';
            checkButton.onclick = () => checkShowStatus(show.tvdb_id);
            li.appendChild(checkButton);
            trackedShows.appendChild(li);
        });
    }

    searchButton.addEventListener('click', searchShows);
    loadTrackedShows();
});
