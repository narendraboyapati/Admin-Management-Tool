
//creating a web server with Express and manipulate file paths using the 'path' module as needed for the application
// instance of the Express application is created using express() and assigned to the variable myApp
const express = require('express');
const path = require('path');
const myApp = express();

//import 'express-fileupload' module for handling file uploads
const fileUpload = require('express-fileupload');
myApp.use(fileUpload());

// Connect to MongoDB database
var mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/projectgroup23')

// Import validation related modules
const { check, validationResult } = require('express-validator');

// Express middlewares are configured to handle form data and JSON data using express.urlencoded() and express.json()
myApp.use(express.urlencoded({ extended: false }));
myApp.use(express.json());

// set the views folder (where will the application find the view)
myApp.set('views', path.join(__dirname, 'views'));

// directing react to our static components: client-side Javascript, CSS, images, ...
myApp.use(express.static(path.join(__dirname, 'public')));

// let the express app know which engine are we using for the view
myApp.set('view engine', 'ejs');

// Define a MongoDB model for admin credentials
const admin = mongoose.model('admin', {
    username: String,
    password: String,
});

// Create an instance of admin credentials
var admincred = new admin({
    username: 'admin',
    password: 'password123'
});

// Define a MongoDB schema for adding pages
const addSchema = new mongoose.Schema({
    pageTitle: String,
    desc: String,
    imageName: String,
    imagePath: String, // Uncomment this line to include imagePath field
});

// Create a MongoDB model for adding pages
const add = mongoose.model('addPage', addSchema);

// Save admin credentials to the database
admincred.save().then(function () {
    console.log('admin credentials are saved. Please lookup for the database collection-projectgroup23 for the saved credentials');
});


// Middleware to fetch all page titles and make them available to all views
myApp.use(async (req, res, next) => {
  try {
      const allPageTitles = await add.find({}, 'pageTitle'); // Fetch only the pageTitle field
      res.locals.allPageTitles = allPageTitles;
      next();
  } catch (error) {
      console.error(error);
      next();
  }
});

// Set up the route for the root URL ('/')
myApp.get('/', (req, res) => {
  add.find({}, 'pageTitle')
      .then(allPageTitles => {
          res.render('form', { errors: [], allPageTitles });
      })
      .catch(error => {
          console.error(error);
          res.render('form', { errors: [] }); // Handle the error appropriately
      });
});

//Invoke submit call after entering the username and password
myApp.post(
    '/submit',
    [
      // Validation rules for each field
      check('username')
        .notEmpty()
        .withMessage('Username is required.'),
      check('password')
        .notEmpty()
        .withMessage('Password is required.'),
    ],
    (req, res) => {
    const errors = validationResult(req);
      console.log('req body is', req.body);
      console.log('errors', errors.array());

    if (!errors.isEmpty()) {
      // If there are validation errors, display them to the user
      return res.render('form', {
        errors: errors.array()
      });
      
    }
    const allPageTitles = res.locals.allPageTitles;
    const { username, password } = req.body;

    if (username === 'admin' && password === 'password123') {
        return res.redirect('/welcome');
      } else {
        return res.render('form', {
          errors: [{ msg: 'Invalid credentials. Please try again.' }],
        });
      }
    }
);

//Render dashboard page to display the welcome message
myApp.get('/welcome', (req, res) => {
    return res.render('welcome');
  });

  //Render addPage to display the title, textbox, image and description fields
  myApp.get('/addpage', (req, res) => {
    return res.render('addpage',{ title: '',textBox: '',heroImage: '',description:'', er: [] });
    
  });

 
  //define a variable to store the images uploaded in add/edit page
  const filePath = 'public/images/';

  // After entering the page details, invoke submit button to process the request
myApp.post('/process', [
    check('title', 'Please enter the page title').notEmpty(),
    check('textBox', 'Please enter image name').notEmpty(),
    check('heroImage', 'Please upload an image').custom((value, { req }) => {
        if (!req.files || !req.files.heroImage) {
            throw new Error('Please upload an image');
        }
        return true;
    }),
    check('description', 'Please enter a description.').notEmpty()
], async (req, res) => {

    // check for errors
    const errors = validationResult(req);
    console.log(errors);

    if (!errors.isEmpty()) {
        const errorArray = errors.array();
        
        //invoke addpage to display the title, textbox, image, description and error messgae(if any) when there are errors
       return res.render('addpage', { title: '',textBox: '',heroImage: '',description:'', er: errorArray });
    }
    else {

      //If there are no errors, execute the else block
        
        const pageTitle = req.body.title; 
        const desc = req.body.description;
        console.log(pageTitle + "  "  + "  " + desc);
        const heroImg = req.files.heroImage;
        const imageName = req.body.textBox;
        const imageFileName = heroImg.name;
        const imageSavePath = path.join(__dirname, filePath, imageFileName);
        await heroImg.mv(imageSavePath);

        const pageData = {
            pageTitle: pageTitle,
            desc: desc,
            imageName: imageName,
            imagePath: 'images/' + imageFileName, // Include imagePath
        };
      console.log(pageData);
        const newPage = new add(pageData);
        await newPage.save();
        
        //render confirmationmessage page after storing all the data in the database in the successfull  case
        return res.render('confirmationMessage');
            
    }
});

//Display confirmation message after adding the page details on addpage
myApp.get('/confirmationMessage', (req, res) => {
  res.render('confirmationMessage');
});


myApp.use('/edit', express.static(path.join(__dirname, 'public')));

//Render editpage.ejs to display the list of pagetitles if it exists
  myApp.get('/editpage', async (req, res) => {
    try {
        const allPageTitles = await add.find({}, 'pageTitle _id'); // Fetch only pageTitle and _id fields
        return res.render('editpage', { allPageTitles });
    } catch (error) {
        console.error(error);
        return res.render('editpage', { allPageTitles: [] });
    }
});

//Render the addeditpage to display the previously added field details (title, imagename and desc) if the page id is found in the db
myApp.get('/edit/:id', async (req, res) => {
    try {
        const pageId = req.params.id;
        const pageDetails = await add.findById(pageId);
           return res.render('addeditpage', {
            title: pageDetails.pageTitle, 
            textBox: pageDetails.imageName,
            heroImage: pageDetails.imagePath,
            description: pageDetails.desc, 
            er: [],
            fromEditPage: true,
            fromDeletePage: false,
            pageDetails: pageDetails
         });
         
        }
        
     catch (error) {
        console.error(error);
        return res.redirect('/editpage');
    }
});

   //Render editpage to display the existing title, textbox, image and description fields added earlier
   myApp.get('/addeditpage', (req, res) => {
    return res.render('addeditpage',{ title: '',textBox: '',heroImage: '',description:'', er: [] });
    
  });

//After editing the page details, call the editprocess route to chk for validation errors(if any). If no errors, save the edited details in the db
myApp.post('/editprocess/:id', [
  check('title', 'Please enter the page title').notEmpty(),
  check('textBox', 'Please enter image name').notEmpty(),
  check('description', 'Please enter a description').notEmpty()
], async (req, res) => {
  const pageId = req.params.id; // Get the page ID from the URL
  const { title, textBox, description } = req.body;

  // Check for errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorArray = errors.array();
    return res.render('addeditpage', {
      title,
      textBox,
      description,
      er: errorArray
    });
  }

  //If no errors, enter the below block to find the pageID, upload a new image, save all the edited details with the new image 
  try {
    const pageDetails = await add.findById(pageId);
    if (!pageDetails) {
      // Handle case where page with given ID doesn't exist
      return res.redirect('/editpage');
    }

    // Update the page details
    pageDetails.pageTitle = title;
    pageDetails.imageName = textBox;
    
    if (req.files && req.files.heroImage) {
      const heroImg = req.files.heroImage;
      const imageFileName = heroImg.name;
      const imageSavePath = path.join(__dirname, filePath, imageFileName);
      await heroImg.mv(imageSavePath);
      // Update the imagePath
      pageDetails.imagePath = 'images/' + imageFileName;
    }

    pageDetails.desc = description;

    // Save the updated details
    await pageDetails.save();

    //After updating all the values, render the editConfirmationMessage page
    return res.redirect('/editconfirmationMessage?fromEditPage=true&fromDeletePage=false&fromAddPage=false');
  } catch (error) {
    console.error(error);
    return res.redirect('/editpage'); // Handle the error appropriately
  }
});


//Display confirmation message after edit the page details on editpage
myApp.get('/editconfirmationMessage', (req, res) => {
  const fromEditPage = req.query.fromEditPage === 'true';
  res.render('editconfirmationMessage', { fromEditPage});
});

myApp.use(express.static(path.join(__dirname, 'public')));

//Render deletepage by passing the empty pageDetails and fromDeletePage variable set to 'true'
myApp.get('/deletepage', (req, res) => {
  res.render('deletepage',{ pageDetails:'', fromDeletePage: true });
});


//Display the editpage when Delete page is invoked to display the list of existing pagetitle(if exists) 
myApp.get('/deletepage/:id', async (req, res) => {
  const pageId = req.params.id;
  
  try {
    const pageDetails = await add.findById(pageId);
    if (!pageDetails) {
      // Handle case where page with given ID doesn't exist
      return res.redirect('/editpage');
    }
    
    // Render the confirmation page with details of the page to be deleted if page details found
     res.render('deletepage', { pageDetails, fromDeletePage: true, fromEditPage: false });
  } catch (error) {
    console.error(error);
    return res.redirect('/editpage'); // Handle the error appropriately
  }
});

//If the page details are found, call the deletepage route along with the pageid that needs to be deleted
myApp.post('/deletepage/:id', async (req, res) => {
  const pageId = req.params.id;
 
  try {
    //Function to find the id in the db and delete by passing the page id as a parameter
    await add.findByIdAndDelete(pageId);
    // Display the deleteConfirmationMessage after 'Confirm Delete' button is invoked
    return res.redirect('/deleteconfirmationMessage?fromDeletePage=true');
   
  } catch (error) {
    console.error(error);
    return res.redirect('/editpage'); // Handle the error appropriately
  }
});


//Display confirmation message after deleting the page details on deletepage
myApp.get('/deleteconfirmationMessage', (req, res) => {
  const fromDeletePage = req.query.fromDeletePage === 'true';
  res.render('deleteconfirmationMessage', { fromDeletePage});
});

//Route to invoke logout page
myApp.get('/logout', (req, res) => {
  res.render('logout');
});

//Route to invoke login page and display all the pageTitles (Render form route)
myApp.get('/login', (req, res) => {
  const allPageTitles = res.locals.allPageTitles; // Retrieve from res.locals
  res.render('form', {
      errors: [], // Pass any necessary data here
      allPageTitles: allPageTitles // Pass allPageTitles to the form view
  });
});

//Route to display the pageDetails when the fieldTitle link is clicked from the login screen
myApp.get('/page/:id', async (req, res) => {
  try {
      const pageId = req.params.id;
      const pageDetails = await add.findById(pageId);
      
      if (!pageDetails) {
          return res.status(404).render('error', { message: 'Page not found' });
      }
      
      // Render the page details.ejs
      return res.render('pagedetails', { pageDetails });
  } catch (error) {
      console.error(error);
      return res.status(500).render('error', { message: 'Internal server error' });
  }
});

//Start the server
myApp.listen(8080);
console.log('application is running on port- 8080');


