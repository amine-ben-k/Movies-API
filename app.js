import express from 'express';
import { createServer } from 'http';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import pg from 'pg';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt'
import dotenv from 'dotenv';


dotenv.config();
const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;

const pool = new pg.Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

pool.connect((err, client, release) => {
    if (err) {
        return console.error('Error acquiring client', err.stack);
    }
    console.log('Connected to PostgreSQL database');
    client.query('SELECT NOW()', (err, result) => {
        release();
        if (err) {
            return console.error('Error executing query', err.stack);
        }
        console.log('PostgreSQL query result:', result.rows[0]);
    });
});

app.use(cors());
app.use(express.json());

const secretKey = process.env.SECRET_KEY;

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.sendStatus(401);
    }

    jwt.verify(token, secretKey, (err, user) => {
        if (err) {
            return res.sendStatus(403);
        }
        req.user = user;
        next();
    });
};
async function findUser(name) {
    // Check in both users and authorized tables
    const userResult = await pool.query('SELECT * FROM users WHERE name = $1', [name]);
    if (userResult.rows.length > 0) {
      return { ...userResult.rows[0], role: 'user' };
    }
  
    const adminResult = await pool.query('SELECT * FROM authorized WHERE username = $1', [name]);
    if (adminResult.rows.length > 0) {
      return { ...adminResult.rows[0], role: 'admin' };
    }
  
    return null;
  }
function authorizeRole(role) {
    return (req, res, next) => {

      if (req.user.role !== role) return res.sendStatus(403);
      next();
    };
  }
  app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
        return res.status(400).json({ error: 'Please provide both username and password.' });
    }

    try {
        const client = await pool.connect();

        // Check if the username already exists
        // const userCheck = await client.query('SELECT * FROM users WHERE name = $1', [username]);
        const userCheck = await findUser(username);
        if (userCheck) {
            client.release();
            return res.status(409).json({ error: 'Username already exists' });
        }        

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert the new user into the database
        const result = await client.query(
            'INSERT INTO users (name, password) VALUES ($1, $2) RETURNING *',
            [username, hashedPassword]
        );
        client.release();

        // Return the newly created user (excluding the password)
        const newUser = result.rows[0];
        delete newUser.password;
        res.status(201).json(newUser);
    } catch (err) {
        console.error('Error executing query', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/login', async (req, res) => {

    try {
        const { name, password } = req.body;
        const user = await findUser(name);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(401).json({ message: 'Invalid password' });


        const token = jwt.sign({ id: user.id, username: user.username, role: user.role}, secretKey, { expiresIn: '1h' });
        res.json({ token, role: user.role });

    } catch (err) {
        console.error('Error executing query', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/', (req, res) => {
    res.send('Welcome to the Movies API');
});


app.post('/movies',authenticateToken,authorizeRole("admin"),async (req, res) => {
    const { title, director_id } = req.body;
    try {
        const client = await pool.connect();
        const result = await client.query(
            'INSERT INTO movies (title, director_id) VALUES ($1, $2) RETURNING *',
            [title, director_id]
        );
        client.release();
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error executing query', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/movies',authenticateToken, async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM movies');
        client.release();
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error executing query', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// app.get('/movies/:id', async (req, res) => {
//     const { id } = req.params;
//     try {
//         const client = await pool.connect();
//         const result = await client.query('SELECT * FROM movies WHERE id = $1', [id]);
//         client.release();
//         if (result.rows.length === 0) {
//             res.status(404).json({ error: 'Movie not found' });
//         } else {
//             res.status(200).json(result.rows[0]);
//         }
//     } catch (err) {
//         console.error('Error executing query', err);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// });


app.put('/movies/:id', async (req, res) => {
    const { id } = req.params;
    const { title, director_id } = req.body;
    try {
        const client = await pool.connect();
        const result = await client.query(
            'UPDATE movies SET title = $1, director_id = $2 WHERE id = $3 RETURNING *',
            [title, director_id, id]
        );
        client.release();
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Movie not found' });
        } else {
            res.status(200).json(result.rows[0]);
        }
    } catch (err) {
        console.error('Error executing query', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});


app.delete('/movies/:id',authenticateToken,authorizeRole("admin"), async (req, res) => {
    const { id } = req.params;
    try {
        const client = await pool.connect();
        const result = await client.query('DELETE FROM movies WHERE id = $1 RETURNING *', [id]);
        client.release();
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Movie not found' });
        } else {
            res.status(200).json({ message: 'Movie deleted', deletedMovie: result.rows[0] });
        }
    } catch (err) {
        console.error('Error executing query', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});



app.post('/directors',authenticateToken,authorizeRole("admin"), async (req, res) => {
    const { name } = req.body;
    try {
        const client = await pool.connect();
        const result = await client.query('INSERT INTO directors (name) VALUES ($1) RETURNING *', [
            name,
        ]);
        client.release();
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error executing query', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/directors',authenticateToken, async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM directors');
        client.release();
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error executing query', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// app.get('/directors/:id', async (req, res) => {
//     const { id } = req.params;
//     try {
//         const client = await pool.connect();
//         const result = await client.query('SELECT * FROM directors WHERE id = $1', [id]);
//         client.release();
//         if (result.rows.length === 0) {
//             res.status(404).json({ error: 'Director not found' });
//         } else {
//             res.status(200).json(result.rows[0]);
//         }
//     } catch (err) {
//         console.error('Error executing query', err);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// });

app.put('/directors/:id', async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    try {
        const client = await pool.connect();
        const result = await client.query(
            'UPDATE directors SET name = $1 WHERE id = $2 RETURNING *',
            [name, id]
        );
        client.release();
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Director not found' });
        } else {
            res.status(200).json(result.rows[0]);
        }
    } catch (err) {
        console.error('Error executing query', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});


app.delete('/directors/:id',authenticateToken,authorizeRole("admin"), async (req, res) => {
    const { id } = req.params;
    try {
        const client = await pool.connect();
        const result = await client.query('DELETE FROM directors WHERE id = $1 RETURNING *', [
            id,
        ]);
        client.release();
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Director not found' });
        } else {
            res.status(200).json({ message: 'Director deleted', deletedDirector: result.rows[0] });
        }
    } catch (err) {
        console.error('Error executing query', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.get('/search',authenticateToken, async (req, res) => {
    const searchTerm = req.query.name;

    if (!searchTerm) {
        return res.status(400).json({ error: 'Please provide a search term' });
    }

    try {
        const result = await pool.query(
            // 'SELECT m.* FROM movies m JOIN directors d ON m.director_id = d.id WHERE d.name ILIKE $1',
            // [`%${searchTerm}%`]
            'SELECT * FROM movies WHERE title ILIKE $1',
            [`%${searchTerm}%`]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }

});
app.get('/ratings',authenticateToken, async (req, res) => {
    const userId = req.user.id;

    try {
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM ratings WHERE user_id=$1',[userId]);
        client.release();
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error executing query', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/movies/:id',authenticateToken, async (req, res) => {
        const { id } = req.params; // Movie ID
        const { rating } = req.body; // Rating from user
        const userId = req.user.id; // Assuming the user's ID is stored in req.user.id from the token
    
        if (rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }
    
        try {
            const client = await pool.connect();
    
            // Insert or update the rating for this user and movie
            await client.query(`
                INSERT INTO ratings (user_id, movie_id, rating)
                VALUES ($1, $2, $3)
                ON CONFLICT (user_id, movie_id) 
                DO UPDATE SET rating = EXCLUDED.rating
            `, [userId, id, rating]);
            const result=await client.query(`
                UPDATE movies
                SET rating = (
                    SELECT AVG(rating)
                    FROM ratings
                    WHERE movie_id = $1
                )
                WHERE id = $1
                RETURNING rating
            `, [id]);    

            const averageRating = result.rows[0].rating;

        client.release();
        res.status(200).json({ message: 'Rating put successfully:'+averageRating });
    } catch (err) {
        console.error('Error executing query', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// app.get('/directors/:id/movies', async (req, res) => {
//     const { id } = req.params;
//     try {
//         const client = await pool.connect();
//         const result = await client.query('SELECT * FROM movies WHERE director_id = $1', [id]);
//         client.release();
//         res.status(200).json(result.rows);
//     } catch (err) {
//         console.error('Error executing query', err);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// });

server.listen(PORT, () => {
    console.log("Server is running on http://localhost:${PORT}");
});
