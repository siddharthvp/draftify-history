// Attribution: Code adapted from https://tools.wmflabs.org/apersonbot/afchistory/

const API_ROOT = 'https://en.wikipedia.org/w/api.php',
	API_SUFFIX = '&format=json&callback=?&continue=';

var showHistory = function () {
	var username = $('#username').val();
	$('#error').hide();
	if (username === '') {
		$('#error').empty();
		$('#error').show();
		$('#error').append(
			$('<div>').addClass('errorbox').text('No username specified.')
		);
		return;
	}

	// Clear all table rows but the first
	// (http://stackoverflow.com/a/370031/1757964)
	$('#result table').find('tr:gt(0)').remove();

	// Prepare the UI for showing the history
	$('#statistics').empty();
	$('#submit')
		.prop('disabled', true)
		.text('Loading...');
	$('#username')
		.prop('disabled', true);
	// $('#result').show();

	// Generate permalink
	// We want what's in the address bar without the ?=___ or #___ stuff
	var permalinkSubstringMatch = /[\#\?]/.exec(window.location.href);
	var permalink = window.location.href;
	if (permalinkSubstringMatch) {
		permalink = window.location.href.substring(0, permalinkSubstringMatch.index);
	}
	permalink += '?user=' + encodeURIComponent(username);
	$('#permalink').empty().append(
		'(', $('<a>').attr('href', permalink).text('permalink'), ' to these results)'
	);


	var baseUrl = API_ROOT + '?action=query&list=usercontribs&ucuser=' + username +
		'&uclimit=500&ucprop=title|timestamp|comment&ucnamespace=0' + API_SUFFIX;

	var query = function (continueData) {
		var queryUrl = baseUrl + continueData;
		$.getJSON(queryUrl).then(function (data) {
			if (data.hasOwnProperty('continue')) {
				display(data);

				// There's some more - recurse
				var newContinueData = '&uccontinue=' + data.continue.uccontinue +
					'&continue=' + data.continue.continue;
				query(newContinueData);

			} else {
				// Nothing else, so we're done
				display(data, true);
			}
		}).fail(function(e) {
			console.log(e);
		});
	};

	query('&continue=');

	var numMoves = 0;

	var display = function (data, done) {
		data = data.query.usercontribs;
		// $('#statistics').before('Loaded ' + (numLoaded += data.length) + ' edits.' + (done ? ' Almost done!' : ''));

		var moveRe = new RegExp(username + ' moved page \\[\\[(.*?)\\]\\] to \\[\\[(Draft:.*?)\\]\\]');

		data.forEach(function (edit) {
			var match = moveRe.exec(edit.comment);
			if (!match) return;

			var fromPage = match[1], toPage = match[2];
			if (fromPage.startsWith('Draft:') ||
				fromPage.startsWith('User:') ||
				fromPage.startsWith('Wikipedia talk:')) {
				return;
			}

			numMoves++;
			var fromLink = 'https://en.wikipedia.org/wiki/' + encodeURIComponent(fromPage);
			var toLink = 'https://en.wikipedia.org/wiki/' + encodeURIComponent(toPage);

			var date = edit.timestamp.slice(0, 10), time = edit.timestamp.slice(11,16);

			// Extract useful parts of edit summary
			// TODO: optimise regexes
			var comment = edit.comment
				.replace(moveRe, '')
				.replace(/^: /, '')
				.replace(/^ over redirect(:|$)/, '')
				.replace(/^ over a redirect without leaving a redirect(:|$)/, '')
				.replace(/^ without leaving a redirect(:|$)/, '')
				.replace(/\(\[\[User:Evad37\/MoveToDraft\.js\|via script\]\]\)$/, '');

			$('#result table tbody').append(
				$('<tr>').append(
					$('<td>').append($('<a>').attr('href', fromLink).text(fromPage).attr('target', '_blank')),
					$('<td>').append($('<a>').attr('href', toLink).text(toPage).attr('target', '_blank')),
					$('<td>').text(date + ' ' + time),
					$('<td>').text(comment),
				)
			);
		});

		$('#statistics')
			.empty()
			.append('Found ' + numMoves + ' draftifications' + (done ? '' : ' so far') + ':');

		if (done) {
			$('#submit')
				.prop('disabled', false)
				.text('Submit');
			$('#username')
				.prop('disabled', false);
		}

	}

};


$(document).ready(function () {

	// Bind form submission handler to submission button & username field
	$('#submit').click(function () {
		showHistory()
	});
	$('#username').keyup(function (e) {
		// Enter was pressed in the username field
		if (e.keyCode == 13) {
			showHistory();
		}
	});

	if (window.location.search.substring(1).indexOf('user=') >= 0 ) {

		// Allow the user to be specified in the query string, like ?user=Example
		var userArgMatch = /&?user=([^&#]*)/.exec(window.location.search.substring(1));
		if (userArgMatch && userArgMatch[1]) {
			$('#username').val(decodeURIComponent(userArgMatch[1].replace(/\+/g, ' ').replace(/_/g, ' ')));
			$('#submit').trigger('click');
		}
	}


});