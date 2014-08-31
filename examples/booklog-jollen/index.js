/**
 * Module dependencies.
 */

var express = require('../../lib/express');

// Path to our public directory

var pub = __dirname + '/public';

// setup middleware

var app = express();
app.use(express.static(pub));

// Optional since express defaults to CWD/views

app.set('views', __dirname + '/views');

// Set our default template engine to "jade"
// which prevents the need for extensions
// (although you can still mix and match)
app.set('view engine', 'jade');

var posts = [];

app.get('/welcome', function(req, res) {
	res.render('index');
});

app.get('/1/post', function(req, res) {
	res.send(posts);
});

app.post('/1/post', function(req, res) {
	var subject;
	var content;
	
	if (typeof(req.body) === 'undefined') {
		subject = req.query.subject;
		content = req.query.content;
	}

	var post = {
		subject: subject,
		content: content
	};

	posts.push(post);

	res.send({ status: 'OK'});
});

app.delete('/1/post', function(req, res) {
	res.send("Delete a post");
});

app.put('/1/post/:postId', function(req, res) {
	var id = req.params.postId;

	res.send("Update a post: " + id);
});

// change this to a better error handler in your code
// sending stacktrace to users in production is not good
app.use(function(err, req, res, next) {
  res.send(err.stack);
});

/* istanbul ignore next */
if (!module.parent) {
  app.listen(3000);
  console.log('Express started on port 3000');
}
