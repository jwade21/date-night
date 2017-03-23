// Auth0 authentication setup
var lock = new Auth0Lock('70MGYz88Zh03iWlMSdley6WPlkhSElYs', 'rattlesnakemilk.auth0.com', {
  auth: {
    params: {
      scope: 'openid email'
    }
  }
});
lock.on("authenticated", function(authResult) {
  lock.getProfile(authResult.idToken, function(error, profile) {
    if (error) {
      console.log('error',error);
    }
    localStorage.setItem('idToken', authResult.idToken);
    localStorage.setItem('username', profile.nickname);
    localStorage.setItem('profilePicture', profile.picture);
    localStorage.setItem('userId', profile.user_id);
    showProfile();
  });
});

// doc ready start
$(document).ready(function () {
  // Check if user is still logged in from previous session
  if (isLoggedIn()) {
    showProfile();
  }
  // Trigger Auth0 lock when login button clicked
  $('#login').on('click', function() {
    lock.show();
  });

  // Call APIs when "datemaker" button clicked
  $('#dateMaker').on('click', function (e) {
    e.preventDefault();

    //MODALS///
    // Check that users have selected a genre and food type
    var emptySelection = $('#movieGenre option:selected').val() === 'default' || $('#foodType option:selected').val() === 'default';

    // If they have not, alert that they must pick Genre and Type
    if (emptySelection) {
      showModal('emptySelection');
    }

    // If they have entered a selection but are not logged in, alert that they will be unable to save results
    else if (!emptySelection && !isLoggedIn()) {
      showModal('notLoggedIn');
      // If user chooses to continue anyway...
      $('#notLoggedIn .continue').on('click', function () {

        loadResultsPage(e);
      });

      // If user chooses to go back, hide modal
      $('#notLoggedIn .goBack').on('click', function () {
        hideModals();
      });
    }

    // If they are logged in and have properly selected genres, send them to the results page
    else {
      loadResultsPage(e);
    }
  });

  // New API call on "Get Next" button click on results page
  $('#getRecipe').on('click', function(e) {
    getRecipeResults(e);
  });
  $('#getMovie').on('click', function(e){
    getMovieResults(e);
  });

  // Open modal to let users add comments to date before saving
  $('#saveResults').on('click', function() {
    if(isLoggedIn()) {
      showModal('saveModal');
    } else {
      showModal('stillNotLoggedIn');
    }
  });

  // save the date results to database
  $('#saveForm').on('submit', function (e) {
    e.preventDefault();

    hideModals();
    saveDateResults();
    $('#nightName').val('');
    $('#nightDescription').val('');
  });

  // Return users to splash page when they click on the logo
  $('#logo').on('click', function () {
    $('#splashPage').removeClass('hidden')
    $('#resultsPage').addClass('hidden');
    $('#profilePage').addClass('hidden');
  });

  // Users can see profile from navigation bar
  $('#showProfile').on('click', function () {
    // Make sure publicDates tab is active by default
    $('#publicDates').addClass('active');
    $('#myDates').removeClass('active');

    // Show profile page
    $('#profilePage').removeClass('hidden');
    $('#resultsPage').addClass('hidden');
    $('#splashPage').addClass('hidden');

    loadDates();
  });

  // Filter feed results to display user's own dates
  $('#myDates').on("click", loadDates);
  $('#publicDates').on("click", loadDates);
  $(document).on('click', '#myDates', function(e){
    e.preventDefault();
    $('#myDates').addClass("active");
    $('#publicDates').removeClass("active");
  })

  //this changes status of tab hover effect
  $(document).on('click', '#publicDates', function(e){
    e.preventDefault();
    $('#publicDates').addClass("active");
    $('#myDates').removeClass("active");
  })

  // Allow user to delete their dates
  $(document).on('click', 'a.delete', function (e) {
    e.preventDefault();
    var li = $(e.currentTarget).parents('li');

    showModal('deleteCheck');

    $('#deleteCheck .continue').on('click', function () {
      hideModals();
      deleteDate(li);
    });

    $('#deleteCheck .goBack').on('click', function () {
      hideModals();
    });
  });

  // Allow user to edit their dates
  $(document).on('click', 'a.edit', function (e) {
    e.preventDefault();

    // Get the li associated with edit and current nightName and nightDescription
    var li = $(e.currentTarget).parents('li');
    var dateId = li.attr('data-dateId');
    var currentNightName = li.find('.nightName').text();
    var currentNightDescription = li.find('.nightDescription').text();

    // Set edit form fields to current name and description values
    $('#newNightName').val(currentNightName);
    $('#newNightDescription').val(currentNightDescription);

    // Attach dateId as data attr to form to access later
    $('#updateForm').attr('data-dateId', dateId);
    showModal('updateModal');
  });

  // When update modal form is submitted...
  $('#updateForm').on('submit', function (e) {
    e.preventDefault();
    var dateId = $('#updateForm').attr('data-dateId');

    // Hide modals and send updates to database
    hideModals();
    updateDateResults(dateId);
  });

  // Modal functionality

  // When the user clicks on <span> (x), close the modal
  $('span.close').on('click', function() {
    hideModals();
  });

  // When the user clicks anywhere outside of the modal, close it
  window.onclick = function(e) {
    var modal = document.getElementById('modalBackground');

    if (e.target == modal) {
      hideModals();
    }
  };

  // Log out via Auth0 when logout button clicked
  $('#logout').on('click', logOut);
});
//doc ready end

//check if user is logged in
function isLoggedIn() {
  var token = localStorage.getItem('idToken')
  // Check for valid user token in localStorage
  if (!token) {
    return false;
  }
  // Extract jwt expiration from token; check validity
  var encodedPayload = token.split('.')[1];
  var decodedPayload = JSON.parse(atob(encodedPayload));
  var exp = decodedPayload.exp;
  var expirationDate = new Date(exp * 1000);

  return new Date() <= expirationDate;
}

//log user and remove stored data
function logOut() {
  localStorage.removeItem('idToken');
  localStorage.removeItem('username');
  localStorage.removeItem('profilePicture');
  localStorage.removeItem('userId');
  window.location.href='http://clrksanford.github.io/date-night/';
}

//PROFILE//
function showProfile() {
  // Hide login button
  $('#login').addClass('hidden');
  // Inject user info into page and show it
  $('.username').text(localStorage.getItem('username'));
  $('.profilePicture').attr('src', localStorage.getItem('profilePicture'));
  $('#userInfo').removeClass('hidden');
}

function loadResultsPage(e) {
  // Hide modals
  hideModals();

  // Reveal results page
  $('#splashPage').addClass('hidden');
  $('#resultsPage').removeClass('hidden');

  // Set dropdowns on results page to same categories previously selected
  setNextDropdowns();

  // Load results
  getMovieResults(e);
  getRecipeResults(e);
}

//GET RECIPES//
function getRecipeResults(e) {
  var clicked = $(e.currentTarget);
  var clickedId = clicked.attr("id");
  var userSelection;
  // Get user selected genre and associated genre code
  if(clickedId === "dateMaker"){
    userSelection = $('#foodType option:selected').val();
  } else if(clickedId === "getRecipe"){
    userSelection = $('#nextFoodType option:selected').val();
  }
  //pull from recipe api
  $.ajax({
    url: "https://thawing-sea-85558.herokuapp.com/recipes/" + userSelection
    // jsonp: "callback",
    // dataType: "jsonp",
    // jsonpCallback: "logResults"
  }).done(function (response) {

    var randomIndex = (Math.round(Math.random()*10));
    var randomRecipe = response[randomIndex];

    showRecipe(randomRecipe);

    // Reset food type selector on splash page
    $('#foodType').selectpicker('val', 'default');
  })
}

//SHOW RECIPES//
function showRecipe(recipe) {
  var recipeTitle = recipe.title;
  var recipeDescription = recipe.description;
  var recipePic = recipe.recipePicture;
  var recipeLink = recipe.recipeURL;

  $('#recipeName').text(recipeTitle);
  $('#recipePic').attr('src',recipePic);
  $('#recipeIngredients').text(recipeDescription);
  $('#recipeURL').attr('href',recipeLink);
}

//GET MOVIE//
function getMovieResults(e) {
  var clicked = $(e.currentTarget);
  var clickedId = clicked.attr("id");
  var userSelection;
  // Get user selected genre and associated genre code
  if(clickedId === "dateMaker"){
    userSelection = $('#movieGenre option:selected').val();
    // toggleBackground(userSelection);
  } else if(clickedId === "getMovie"){
    userSelection = $('#nextMovieGenre option:selected').val();
    // toggleBackground(userSelection);
  }
  // Create object with "official genre codes"
  var genreObj = {
    'horror': '27',
    'comedy': '35',
    'drama': '18',
    'romance': '10749'
  };
  var genreCode = genreObj[userSelection];
  // Results returned by page num; get results from random page between 1 - 21
  var pageNum = Math.round((Math.random()*10) + 1);
  //Movie API//
  $.ajax({
    url: 'https://api.themoviedb.org/3/discover/movie?api_key=63efd94ec261de399db1622ddbc1ab22&language=en-US&sort_by=popularity.desc&include_adult=false&page=' + pageNum + '&with_genres=' + genreCode
  }).done(function(data) {
    // Of the 20 results, randomly select a movie
    var randomIndex = (Math.round(Math.random()*20));
    var randomMovie = data.results[randomIndex];

    showMovie(randomMovie);

    // Reset movie genre selector on slpash page
    $('#movieGenre').selectpicker('val', 'default');
  }).fail(function (jqXHR, textStatus, errorThrown) {
    console.log(errorThrown);
  });
}

//SHOW MOVIE//
function showMovie(movie) {
  var movieTitle = movie.title;
  var movieSummary = movie.overview;
  var moviePic = 'http://image.tmdb.org/t/p/w185' + movie.poster_path;

  $('#movieTitle').text(movieTitle);
  $('#moviePic').attr('src',moviePic);
  $('#movieSummary').text(movieSummary);
}

//CRUD Results to mongo and profile
function saveDateResults() {
  var username = localStorage.getItem('username');
  var date = new Date();
  var moviePicture = $('#moviePic').attr('src');
  var recipePicture = $('#recipePic').attr('src');
  var profilePicture = localStorage.getItem('profilePicture');
  var userId = localStorage.getItem('userId');
  var nightName = $('#nightName').val();
  var nightDescription = $('#nightDescription').val();
  var recipeLINK = $('#recipeURL').attr('href')
  var data = {
    username: username,
    date: date,
    moviePicture: moviePicture,
    recipePicture: recipePicture,
    profilePicture: profilePicture,
    userId: userId,
    nightName: nightName,
    nightDescription: nightDescription,
    recipeURL: recipeLINK
  };
  //CRUD to MONGO API//
  $.ajax({
    url: 'https://thawing-sea-85558.herokuapp.com/profile',
    data: data,
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + localStorage.getItem('idToken')
    }
  }).done(function (response) {
    // Hide results page and take users to profile page
    $('#resultsPage').addClass('hidden');
    $('#profilePage').removeClass('hidden');

    // Make sure public dates tab is visible by default
    $('#publicDates').addClass('active');
    $('#myDates').removeClass('active')

    // Reload list of dates to dispaly in profile feed
    loadDates();
  }).fail(function (jqXHR, textStatus, errorThrown) {
    console.log(errorThrown);
  });
}

function updateDateResults(id) {

  var data = {
    nightName: $('#newNightName').val(),
    nightDescription: $('#newNightDescription').val()
  };

  $.ajax({
    url: 'https://thawing-sea-85558.herokuapp.com/profile/' + id,
    data: data,
    method: 'PUT',
    headers: {
      'Authorization': 'Bearer ' + localStorage.getItem('idToken')
    }
  })
  .done(function (response) {
    // Reset the form fields
    $('#newNightName').val('');
    $('#newNightDescription').val('');

    loadDates();
  });
}

//pull dates from mongo api
function loadDates(event) {
  if(event){
    event.preventDefault();
  }
  var activeTab = $(this);
  var link;
  var userId = localStorage.getItem('userId');
  if(activeTab.attr("id")=== "myDates"){
    link = "https://thawing-sea-85558.herokuapp.com/profile/" + userId;
  } else {
    link = "https://thawing-sea-85558.herokuapp.com/profile/";
  }
    $.ajax({
      url: link,
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('idToken')
      }
    }).done(function(response){
    $('#dates').empty();
    response.forEach(function(date){
      loadDate(date);
    });
  }).fail(function (jqXHR, textStatus, errorThrown) {
    console.log(errorThrown);
  });
}

//Load a date into dates list
function loadDate(date) {
  var li = $('<li />').attr({
    "data-userId": date.userId,
    "data-dateId": date._id,
    "class": "clearfix"
  });

  // Create li's direct children
  var column1 = $('<div />').addClass('column').attr('id', 'column1');
  var column2 = $('<div />').addClass('column').attr('id', 'column2');
  var column3 = $('<div />').addClass('column').attr('id', 'column3');

  // Create column1's direct children
  var userBox = $('<div />').addClass('userBox clearfix');
  var crud = $('<div />').addClass('crud');

  // Create userBox children
  var profPic = $('<img />').attr('src', date.profilePicture).addClass('profilePicture');
  var user = $('<p />').text(date.username).addClass('username');

  var timeAgo = timeCalculator(date);
  var time = $('<p />').text(timeAgo);

  // Create crud children
  var deleteButton = $('<a />').attr('href', '#').text('Delete').addClass('delete');
  var editButton = $('<a />').attr('href', '#').text('Edit').addClass('edit');

  // Create column2 children
  var moviePic = $('<img />').attr('src', date.moviePicture).addClass('moviePicture');
  var recipePic = $('<img />').attr('src', date.recipePicture).addClass('recipePicture');
  var recipeLink = $('<a target="_blank">GET RECIPE</a>').attr('href',date.recipeURL);

  // Create column3 children
  var nightTitle = $('<h3 />').text(date.nightName).addClass('nightName');
  var nightSummary = $('<p />').text(date.nightDescription).addClass('nightDescription');

  // Append userbox children
  userBox.append(profPic, user, time);

  // Append crud children
  crud.append(deleteButton, editButton);

  // Append column children
  column1.append(userBox, crud);
  column2.append(moviePic, recipePic, recipeLink);
  column3.append(nightTitle, nightSummary);

  // Append columns to li
  li.append(column1, column2, column3);

  // Append li to ul
  $('#dates').prepend(li);

  // Only show delete and edit buttons on signed in user's own nights
  var userId = localStorage.getItem('userId');
      if(userId !== date.userId) {
      $(deleteButton).addClass('hidden');
      $(editButton).addClass('hidden');
    }
}
//adds time display to each list item
function timeCalculator(date) {
  var date = new Date(date.date);
  var currentTime = new Date();
  var difference = (currentTime - date);
  var year = Math.round(difference / (12*4*7*24*60*60*1000))
  var month = Math.round(difference / (4*7*24*60*60*1000));
  var week = Math.round(difference / (7*24*60*60*1000));
  var day = Math.round(difference / (24*60*60*1000));
  var hour = Math.round(difference / (60*60*1000));
  var minute = Math.round(difference / (60*1000));
  var time = $('<span />');
  if (month >= 12) {
    return year + ' years ago'
  } else if (week >= 4) {
    return month + ' months ago'
  } else if (day >= 7) {
    return week + ' weeks ago'
  } else if (hour > 24) {
    return day + ' days ago'
  } else if (minute < 1) {
    return 'Just now';
  } else if (minute < 2) {
    return minute + ' minute ago';
  } else if (minute < 60) {
    return minute + ' minutes ago';
  } else {
    return hour + ' hours ago';
  }
}

//confirm the list item belongs to user
function isUsersDate(e) {
  var li = $(e.currentTarget).parent('li');
  var liUser = li.attr('data-userId');
  var userId = localStorage.getItem('userId');

  return liUser === userId;
}

//gives user ability to delete list item
function deleteDate(target) {
  var dateId = target.attr('data-dateId');
  //CRUD call to mongo api
  $.ajax({
    url: "https://thawing-sea-85558.herokuapp.com/profile/" + dateId,
    method: 'DELETE',
    headers: {
      'Authorization': 'Bearer ' + localStorage.getItem('idToken')
    }
  }).done(function (response) {
      loadDates();
  }).fail(function (jqXHR, textStatus, errorThrown) {
      console.log(errorThrown);
    })
}

//MODALS
function showModal(id) {

  // Show parent modal background
  $('.modal').css('display', 'block');

  // Loop through modals
  var modalArray = $('.modal').children('.modal-content');

  for(var i=0; i<modalArray.length; i++) {
    var modal = modalArray[i];
    var modalId = $(modal).attr('id');

    // If the target modal, show it; hide all others
    if($(modal).attr('id') === id) {
      $(modal).css('display', 'block');
    } else {
      $(modal).css('display', 'none');
    }
  }
}

function hideModals() {
  // Hide parent modal background
  $('.modal').css('display', 'none');

  // Loop through modal windows and hide them all
  var modalArray = $('.modal').children('.modal-content');

  for(var i=0; i<modalArray.length; i++) {
    var modal = modalArray[i];
    $(modal).css('display', 'none');
    }
}
//DROPDOWNS
function setNextDropdowns() {
  var previousGenre = $('#movieGenre option:selected').val()
  var previousFood = $('#foodType option:selected').val()

  $('#nextMovieGenre').selectpicker('val', previousGenre);
  $('#nextFoodType').selectpicker('val', previousFood);
}
