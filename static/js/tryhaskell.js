// Main tryhaskell module.
tryhaskell = {};

// A success hook which can be bound and rebound or set as null.
tryhaskell.successHook = null;

// The current page number.
tryhaskell.currentPage = null;

// Stdout state from the current IO evaluation.
tryhaskell.stdout = [];

// Stdin state for the current IO evaluation.
tryhaskell.stdin = [];

// IO expression.
tryhaskell.io = null;

// A pre-command hook which can prevent the command from being run if
// it returns true.
tryhaskell.preCommandHook = function(line,report){
    var m, pages = tryhaskell.pages.list;
    if (m = line.trim().match(/^step([0-9]+)/)) {
        var n = m[1] * 1;
        if (n <= pages.length) {
            tryhaskell.setPage(n,null);
            report();
            return true;
        }
    }
    else if (m = line.trim().match(/^lesson([0-9]+)/)) {
        var n = m[1] * 1;
        for (var i = 0; i < pages.length; i++) {
            if (pages[i].lesson == n) {
                tryhaskell.setPage(i,null);
                report();
                return true;
            }
        }
    } else if (line.trim() == 'next') {
        if (tryhaskell.currentPage < tryhaskell.pages.list.length) {
            tryhaskell.setPage(tryhaskell.currentPage + 1);
        }
        report();
        return true;
    } else if (line.trim() == 'back') {
        if (tryhaskell.currentPage > 1) {
            tryhaskell.setPage(tryhaskell.currentPage - 1);
        }
        report();
        return true;
    } else if (line.trim() == 'help') {
        tryhaskell.setPage(2,null);
        report();
        return true;
    }
    return false;
};

// Make the console controller.
tryhaskell.makeController = function(){
    tryhaskell.controller = $('#console').console({
        promptLabel: 'λ ',
        commandValidate: function(line){
            if (line == "") return false;
            else return true;
        },
        commandHandle: function(line,report){
            if(tryhaskell.io === null){
                if(!tryhaskell.preCommandHook(line,report)){
                    tryhaskell.ajaxCommand(line,report,undefined);
                }
            } else {
                tryhaskell.stdin.push(line);
                tryhaskell.ajaxCommand(tryhaskell.io,report,tryhaskell.stdin);
            }
        },
        autofocus: true,
        animateScroll: true,
        promptHistory: true,
        welcomeMessage: 'Type Haskell expressions in here.',
        continuedPromptLabel: '> '
    });
};

// Make an AJAX command to the server with the given line.
tryhaskell.ajaxCommand = function(line,report,stdin){
    var args = { 'exp': line,
                 'args': JSON.stringify(stdin)
               };
    $.ajax({
        url: '/eval',
        dataType: 'json',
        data: args,
        success: function(result){
            if(result.stdout !== undefined){
                result = result.stdout;
                tryhaskell.io = line;
                var msgs = [];
                if(result != null){
                    for(var i = tryhaskell.stdout.length; i < result.length; i++) {
                        msgs.push({ msg: result[i], className: 'jquery-console-stdout' });
                    }
                }
                tryhaskell.stdout = result;
                tryhaskell.controller.continuedPrompt = true;
                report(msgs);
                tryhaskell.controller.continuedPrompt = false;
            } else {
                if(result.error !== undefined){
                    result = result.error;
                    report([{ msg: result || 'Unspecified error. Have you installed mueval?',
                              className:'jquery-console-error' }]);
                } else if(result.success){
                    result = result.success;
                    var msgs = [];
                    if(result.stdout != null){
                        for(var i = tryhaskell.stdout.length; i < result.stdout.length; i++) {
                            msgs.push({ msg: result.stdout[i], className: 'jquery-console-stdout' });
                        }
                    }
                    if(tryhaskell.successHook != null)
                        tryhaskell.successHook(result);
                    msgs.push({ msg: result.value, className: 'jquery-console-value' });
                    msgs.push({ msg: ':: ' + result.type, className: 'jquery-console-type' });
                    report(msgs);
                }
                tryhaskell.io = null;
                tryhaskell.stdout = [];
                tryhaskell.stdin = [];
            }
        }
    });
};

// Make the guide on the rhs.
tryhaskell.makeGuide = function(){
    var match = window.location.href.match(/#step([0-9]+)$/);
    if(match){
        tryhaskell.setPage(match[1]*1,null);
    } else {
        tryhaskell.setPage(1,null);
    }
};

// Set the current page.
tryhaskell.setPage = function(n,result){
    var page = tryhaskell.pages.list[n-1];
    if(page){
        // Update the current page content
        var guide = $('#guide');
        guide.html(typeof page.guide == 'string'? page.guide : page.guide(result));
        tryhaskell.makeGuidSamplesClickable();
        // Update the location anchor
        if (tryhaskell.currentPage != null)
            window.location = '/#step' + n;
        tryhaskell.currentPage = n;
        // Setup a hook for the next page
        var nextPage = tryhaskell.pages.list[n];
        if(nextPage) {
            tryhaskell.successHook = function(result){
                if (nextPage.trigger &&
                    nextPage.trigger(result))
                    tryhaskell.setPage(n+1,result);
            };
        }
    } else {
        throw "Unknown page number: " + n;
    }
};

// Make the code examples in the guide clickable so that they're
// inserted into the console.
tryhaskell.makeGuidSamplesClickable = function() {
    $('#guide code').each(function(){
        $(this).css('cursor','pointer');
        $(this).attr('title','Click me to insert "' +
                     $(this).text() + '" into the console.');
        $(this).click(function(){
            tryhaskell.controller.promptText($(this).text());
            tryhaskell.controller.inner.click();
        });
    });
}

// Display the currently active users
tryhaskell.activeUsers = function(){
    var active = $('.active-users');
    // Tomorrow theme
    var colors =
        ["#4d4d4c" // Foreground
         ,"#8e908c" // Comment
         ,"#c82829" // Red
         ,"#f5871f" // Orange
         ,"#eab700" // Yellow
         ,"#718c00" // Green
         ,"#3e999f" // Aqua
         ,"#4271ae" // Blue
         ,"#8959a8" // Purple
         // Solarized theme
         ,"#002b36" // base03
         ,"#073642" // base02
         ,"#586e75" // base01
         ,"#657b83" // base00
         ,"#839496" // base0
         ,"#b58900" // yellow
         ,"#cb4b16" // orange
         ,"#dc322f" // red
         ,"#d33682" // magenta
         ,"#6c71c4" // violet
         ,"#268bd2" // blue
         ,"#2aa198" // cyan
         ,"#859900" // green
        ]
    function update(){
        $.get('/users',function(users){
            users = JSON.parse(users);
            $('.active-users .user').remove();
            for(var i = 0; i < users.length; i++){
                var color = colors[users[i][0] % colors.length];
                if (!color) color = colors[0];
                active.append($('<div class="user"></div>').css('background-color',color));
            }
        });
    }
    setInterval(update,5000);
    update();
};

// Handy method.
String.prototype.trim = function() {
    return this.replace(/^[\t ]*(.*)[\t ]*$/,'$1');
};

// Main entry point.
$(function(){
    tryhaskell.makeController();
    tryhaskell.makeGuide();
    tryhaskell.activeUsers();
});
