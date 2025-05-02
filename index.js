require('dotenv').config()
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const port = process.env.PORT || 5000;

app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true
}))
app.use(express.json())
app.use(cookieParser())


const verifyToken = (req, res, next) => {
    const token = req.cookies?.token

    if (!token) {
        return res.status(401).send({ message: "unauthorized access. token nai" })
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: "unauthorized access token changed" })
        }
        console.log(decoded)
        req.user = decoded
        return next()
    })
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jtk1w.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });

        const categoriesCollection = client.db('libraryDB').collection('categories')
        const categoryWiseBooksCollection = client.db('libraryDB').collection('category_wise_books')
        const borrowedBookCollection = client.db('libraryDB').collection('borrowed_book')


        // auth related api
        app.post('/jwt', (req, res) => {
            const user = req.body
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '5hr' })

            res.cookie('token', token, {
                httpOnly: true,
                secure: false
            })
                .send({ success: true })
        })

        app.post('/logout', (req, res) => {
            res
                .clearCookie('token', {
                    httpOnly: true,
                    secure: false
                    // secure: process.env.NODE_ENV === 'production',
                    // sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict'
                })
                .send({ success: true })
        })

        app.get('/categories', async (req, res) => {
            // console.log(req?.cookies?.token)
            const cursor = categoriesCollection.find()
            const result = await cursor.toArray()
            res.send(result)
        })

        app.get('/categoryWiseBooks/:category', async (req, res) => {
            const category = req.params.category
            const query = { category }
            const result = await categoryWiseBooksCollection.find(query).toArray()
            res.send(result)
        })

        app.get('/books/:id', verifyToken, async (req, res) => {
            const id = req.params.id

            const query = { bookId: parseInt(id) }
            const result = await categoryWiseBooksCollection.findOne(query)
            res.send(result)
        })


        app.get('/books', verifyToken, async (req, res) => {
            const books = await categoryWiseBooksCollection.find().toArray()
            res.send(books)
        })

        app.get('/borrowed-books/:email', verifyToken, async (req, res) => {
            const email = req.params.email
            if (req.user?.email !== email) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            const query = { email }
            const result = await borrowedBookCollection.find(query).toArray()
            res.send(result)

        })

        app.post('/borrow', async (req, res) => {
            const { bookId, userName, email, returnDate } = req.body
            const query = { bookId }
            const book = await categoryWiseBooksCollection.findOne(query)
            // res.send(book)

            if (!book || book.quantity === 0) {
                return res.status(400).json({ message: "Book not available" })
            }
            await categoryWiseBooksCollection.updateOne({ bookId: bookId }, { $inc: { quantity: -1 } })

            // add to the borrowed book collection
            const borrowedBook = {
                bookId: book.bookId,
                bookName: book.bookName,
                category: book.category,
                image: book.image,
                author: book.author, userName, email, returnDate, borrowedAt: new Date()
            }
            await borrowedBookCollection.insertOne(borrowedBook)
            res.send({ success: true })

        })

        app.post('/return-books/:id', async (req, res) => {
            const id = req.params.id

            const { bookId } = req.body

            const query = { _id: new ObjectId(id) }
            const result = await borrowedBookCollection.deleteOne(query)
            res.send({ success: true, result })

            await categoryWiseBooksCollection.updateOne({ bookId: bookId }, { $inc: { quantity: 1 } })

            res.send({ success: true })
        })

        app.post('/addBooks', async (req, res) => {
            const newBook = req.body

            const result = await categoryWiseBooksCollection.insertOne(newBook)
            res.send(result)
        })


        app.put('/books/:id', async (req, res) => {
            const id = parseInt(req.params.id)
            const query = { bookId: id }
            const options = { upsert: true }
            const updatedDoc = {
                $set: req.body
            }

            const result = await categoryWiseBooksCollection.updateOne(query, updatedDoc, options)
            res.send(result)

        })

        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run()



app.get('/', (req, res) => {
    res.send('Hello world')
})

app.listen(port, () => {
    console.log(`Library is waiting at :${port}`)
})