require('dotenv').config()
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const port = process.env.PORT || 5000;

app.use(cors())
app.use(express.json())


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


        app.get('/categories', async (req, res) => {
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

        app.get('/books/:id', async (req, res) => {
            const id = req.params.id
            // console.log(typeof (parseInt(id)))
            const query = { bookId: parseInt(id) }
            const result = await categoryWiseBooksCollection.findOne(query)
            res.send(result)
        })

        app.get('/borrowed-books/:email', async (req, res) => {
            const email = req.params.email
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
            // const id = req.params.id
            const { bookId } = req.body
            console.log(bookId)
            const query = { _id: new ObjectId(id) }
            const result = await borrowedBookCollection.deleteOne(query)
            res.send({ success: true, result })

            await categoryWiseBooksCollection.updateOne({ bookId: bookId }, { $inc: { quantity: 1 } })

            res.send({ success: true })
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