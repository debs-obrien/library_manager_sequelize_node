"use strict";
var express = require('express');
var router = express.Router();
const moment = require('moment');
const Book = require('../models').Book;
const Loan = require('../models').Loan;
const Patron = require('../models').Patron;

/* GET all books */
router.get('/', function(req, res) {
    Book.findAll({ order: [["first_published", "DESC"]] }).then((book) => {
        res.render('all_books', {
            books: book,
            title: 'Books'
        });
    });
});

/* GET overdue books */
router.get('/overdue_books', function(req, res) {
    Book.findAll(
        { include: [
        { model: Loan,
            where: {
                returned_on: null,
                return_by: {
                $lte: moment().format("YYYY-MM-DD")
                }
            }
        }
    ]
    })
        .then((book) => {
        res.render('all_books', {
            books: book,
            title: 'Overdue Books'
        });
    });
});

/* GET checked out books */
router.get('/checked_books', function(req, res) {
    Book.findAll({ include: [
        { model: Loan,
            where: {
                returned_on: {
                    $eq: null
                }
            }
        }
    ]
    })
        .then((book) => {
        res.render('all_books', {
            books: book,
            title: 'Checked Out Books'
        });
    });
});

/* GET add new book form */
router.get('/new_book', (req, res) =>{
    res.render('new_book', {
                heading: 'New Book',
            });
});

/* ADD new book - checks for errors carries over values to new rendered page */
router.post('/new_book', (req, res, next) =>{
    Book.create(req.body)
        .then(() =>{
            res.redirect("../books");
        }).catch((error) => {
            if(error.name === "SequelizeValidationError") {
                res.render("new_book", {
                    title: req.body.title,
                    author: req.body.author,
                    genre: req.body.genre,
                    first_published: req.body.first_published,
                    errors: error.errors,
                    heading: "New Book Missing Info"
                })
            }else if(error.name === "SequelizeUniqueConstraintError"){
                res.render("new_book", {
                    title: req.body.title,
                    author: req.body.author,
                    genre: req.body.genre,
                    first_published: req.body.first_published,
                    errors: error.errors,
                    heading: "That Book seems to be already in our system"
                })
            } else {
                throw error;
            }

    }).catch((error) => {
            res.status(500).send(error);
            console.log(error)
        })

});
/* GET details of book */
router.get('/:id', (req, res) =>{
    const getBook = Book.findOne({
        where: [
            { id: req.params.id }
        ]
    });

    const getLoans = Loan.findAll({
        where: [
            { book_id: req.params.id }
        ],
        include: [{
            model: Patron
        },
            {
                model: Book}
        ],
    });

    Promise.all([getBook, getLoans])
        .then(results => {
        res.render('book_detail', {
            book: results[0],
            loans: results[1]
        });
    });
});

/* UPDATE details of book */
router.post('/:id/update', (req, res) =>{
    const getBook = Book.findOne({
        where: [
            { id: req.params.id }
        ]
    });
    const getLoans = Loan.findAll({
        where: [
            { book_id: req.params.id }
        ],
        include: [{
            model: Patron
        }],
    });

    Promise.all([getBook, getLoans]).then(results => {
        Book.update(req.body, {
            where: [{id: req.params.id}]
        }).then(() => {
            res.redirect('/books');
        }).catch((error) =>{
            if(error.name === "SequelizeValidationError") {
                res.render('book_detail', {
                    book: results[0],
                    loans: results[1],
                    errors: error.errors
                });
            } else {
                res.status(500).send(error);
            }
        })

    });
});
// Get return of book details
router.get('/:id/return', (req, res) =>{
    Loan.findOne({
        where: [
            { book_id: req.params.id }
        ],
        include: [
            { model: Patron },
            { model: Book }
        ]
    }).then((loan) => {
            res.render('return_book', {
                loan: loan,
                returned_on: moment().format("YYYY-MM-DD"),
                heading: "Return Book"
            });
    });
});

/* UPDATE returned book if date is added and valid */
router.post('/:id/return', (req, res, next) => {
    let errors = [];
    let returned_on = req.body.returned_on;
    let today = moment().format("YYYY-MM-DD");
    if(!returned_on){
        errors.push('You need to add a date. How about today?')
    }else if(returned_on > today){
        errors.push('That\'s not a valid date. How about today?');
    }
    if(errors.length > 0){
        Loan.findOne({
            where: [
                { book_id: req.params.id }
            ],
            include: [
                { model: Patron },
                { model: Book }
            ]
        }).then((loan) => {
            res.render('return_book', {
                loan: loan,
                returned_on: today,
                heading: "Return Book",
                errors: errors
            });
        });
    }else{
        Loan.update(req.body, { where: [{ book_id: req.params.id }] })
            .then(() => {
                res.redirect('/loans')
            })
    }



});

module.exports = router;