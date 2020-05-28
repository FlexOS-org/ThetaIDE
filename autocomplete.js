const FileSystem = require('fs');
const { spawn }  = require('child_process');
const cssParser  = require('./cssParser/cssParser.js');

var id;
var hInstance;

var MAX_TAGS = [];

let CONTENT = "";
let closeTag = true;

let currentTokenType = "";

var bContextMenu = false;

function init(HInstance) {
    hInstance = HInstance;
}

function appendArrayToAnother(array1, array2) {
    for(i = 0; i < array2.length; i++) {
        array1.push(array2[i]);
    }
}

function filter(array, value, bLowerCase) {
    let result = [];
    let begins = [];
    let ends   = [];
    
    var originalArray = [];
    for(i = 0; i < array.length; i++) {
        originalArray[i] = array[i];
    }
    
    let originalValue = value;
    
    if(bLowerCase){
        value = value.toLowerCase();
        for(i = 0; i < array.length; i++) {
            array[i] = array[i].toLowerCase();
        }
    }
    
    for(i = 0; i < array.length; i++) {
        if(array[i].startsWith(value)) {
            begins.push(array[i]);
        } else if(array[i].search(value) != -1) {
            ends.push(array[i]);
        }
    }
    
    for(i = 0; i < originalArray.length; i++) {
        if(begins.indexOf(originalArray[i].toLowerCase()) != -1) {
            result.push(originalArray[i]);
        }
    }
    
    for(i = 0; i < originalArray.length; i++) {
        if(ends.indexOf(originalArray[i].toLowerCase()) != -1) {
            result.push(originalArray[i]);
        }
    }
    
    return result;
}

function extractTagName(content, cursor) {
    let cursorIndex        = hInstance.indexFromPos(cursor);
    let nearestOpenBracket = 0;
    
    for(d = cursorIndex; d > 0; d--) {
        if(hInstance.getTokenAt(hInstance.posFromIndex(d)).type == "tag bracket") {
            nearestOpenBracket = d;
            break;
        }
    }
    
    content = content.slice(nearestOpenBracket, content.length);
    
    const spacePos = content.search(" ");
    content = content.substring(0, spacePos);
    
    content = content.split(" ").join("");
    content = content.split("\n").join("");
    
    return content.toLowerCase();
}

function displayAutocomplete(arrayElements, arrayTypes) {
    let xPos = document.getElementsByClassName('CodeMirror-cursor')[0].style.left;
    let x = xPos.replace("px", "");
    x = parseFloat(x);
    x = x + 80;
    x = x + "px";
    
    let yPos = document.getElementsByClassName('CodeMirror-cursor')[0].style.top;
    let y = yPos.replace("px", "");
    y = parseInt(y);
    y = y + 30;
    y = y + "px";

    if(parseInt(y.replace("px", "")) > $(window).height() / 2) {
        $("#_list").css({
            "display": "inline-block",
            "left"   : x,
            "top"    : (parseInt(y.replace("px", "")) - 30 - 210 - $(".CodeMirror-scroll").scrollTop()) + "px"
        });
    } else {
        $("#_list").css({
            "display": "inline-block",
            "left"   : x,
            "top"    : y
        });
    }
    
    if(parseInt(x.replace("px", "")) > $(window).width() / 2) {
        $("#_list").css({
            "display": "inline-block",
            "left"   : (parseInt(x.replace("px", "")) - 500 - $(".CodeMirror-scroll").scrollLeft()) + "px"
        });
    } else {
        $("#_list").css({
            "display": "inline-block",
            "left"   : x,
        });
    }

    $("#_list").empty();
    
    if(arrayElements.length > 100) {
        arrayElements.length = 100;
    }
    
    if(currentTokenType == "atom") {
        for(i = 0; i < arrayElements.length; i++) {
            $("#_list").append('<div class="item" id="_' + i + '"><span class="span">' + arrayElements[i].split("&").join("&amp;").split("#").join("&#35;") + '<span class="span" style="position: absolute; left: 430px;">' + arrayElements[i] + '</span></span></div><i class="' + arrayTypes[i] + '"></i>');
        }
    } else {
        for(i = 0; i < arrayElements.length; i++) {
            $("#_list").append('<div class="item" id="_' + i + '"><span class="span">' + arrayElements[i] + '</span></div><i class="' + arrayTypes[i] + '"></i>');
            if(document.getElementsByClassName("item")[i].offsetHeight != 30) {
                document.getElementsByClassName(arrayTypes[i])[i].style = "height: " + document.getElementsByClassName("item")[i].offsetHeight + "px; line-height: " + document.getElementsByClassName("item")[i].offsetHeight + "px;";
            }
        }
    }
}

function extractAttributeName(content, cursor) {
    let cursorIndex        = hInstance.indexFromPos(cursor);
    let attName            = "";
    
    for(d = cursorIndex; d > 0; d--) {
        if(hInstance.getTokenAt(hInstance.posFromIndex(d)).type == "attribute") {
            attName = hInstance.getTokenAt(hInstance.posFromIndex(d)).string;
            break;
        }
    }
    
    return attName.toLowerCase();
}

function extractMediaTypeFromLink(content, cursor) {
    let cursorIndex        = hInstance.indexFromPos(cursor);
    let mediaType          = "";
    let string = "";
    
    for(d = cursorIndex; d > 0; d--) {
        if(hInstance.getTokenAt(hInstance.posFromIndex(d)).type == "attribute" && hInstance.getTokenAt(hInstance.posFromIndex(d)).string.toLowerCase() == "rel") {
            string = hInstance.getTokenAt(hInstance.posFromIndex(d + 5)).string;
            break;
        }
    }
    
    if(string.length != 0) {
        return string;
    } else {
        return "empty";
    }
}

function hasAttributeWithValue(content, cursor, attributeString, attributeValue) {
    let cursorIndex        = hInstance.indexFromPos(cursor);
    let attName            = "";
    
    for(d = cursorIndex; d > 0; d--) {
        if(hInstance.getTokenAt(hInstance.posFromIndex(d)).type == "attribute" && hInstance.getTokenAt(hInstance.posFromIndex(d)).string.toLowerCase() == attributeString) {
            for(i = cursorIndex; i > 0; i--) {
                if(hInstance.getTokenAt(hInstance.posFromIndex(hInstance.getTokenAt(hInstance.posFromIndex(d)).end + i)).string.split("'").join("").split('"').join("").toLowerCase() == attributeValue) {
                    return true;
                    break;
                }
            }
        }
    }
}

function gatherAllIDs(content) {
    let tokens = [];
    let bId    = false;
    for(i = 0; i < content.length; i++) {
        if(bId == false && hInstance.getTokenTypeAt(hInstance.posFromIndex(i)) == "attribute" && hInstance.getTokenAt(hInstance.posFromIndex(i)).string.toLowerCase() == "id") {
            bId = true;
        }
        
        else if(bId == true && hInstance.getTokenTypeAt(hInstance.posFromIndex(i)) == "string") {
            tokens.push("#" + hInstance.getTokenAt(hInstance.posFromIndex(i)).string.split("'").join("").split('"').join(""));
            bId = false;
        }
    }
    
    return tokens;
}

function gatherAllLinkedStylesheets(content, cursor) {
    content = content.substring(0, hInstance.indexFromPos(cursor));
    let stylesheets = [];
    for(i = 0; i < content.match(/(<\s*link\s*type\s*=\s*('text\/css'|"text\/css"|text\/css)\s*rel\s*=\s*('stylesheet'|"stylesheet"|stylesheet)\s*href\s*=\s*.*>)|(<\s*link\s*type\s*=\s*('text\/css'|"text\/css"|text\/css)\s*href\s*=\s*.*>)|(<\s*link\s*rel\s*=\s*('stylesheet'|"stylesheet"|stylesheet)\s*href\s*=\s*.*>)|(<\s*link\s*rel\s*=\s*('stylesheet'|"stylesheet"|stylesheet)\s*type\s*=\s*('text\/css'|"text\/css"|text\/css)\s*href\s*=\s*.*>)/g).length; i++) {
        stylesheets.push(content.match(/(<\s*link\s*type\s*=\s*('text\/css'|"text\/css"|text\/css)\s*rel\s*=\s*('stylesheet'|"stylesheet"|stylesheet)\s*href\s*=\s*.*>)|(<\s*link\s*type\s*=\s*('text\/css'|"text\/css"|text\/css)\s*href\s*=\s*.*>)|(<\s*link\s*rel\s*=\s*('stylesheet'|"stylesheet"|stylesheet)\s*href\s*=\s*.*>)|(<\s*link\s*rel\s*=\s*('stylesheet'|"stylesheet"|stylesheet)\s*type\s*=\s*('text\/css'|"text\/css"|text\/css)\s*href\s*=\s*.*>)/g)[i].slice(content.match(/(<\s*link\s*type\s*=\s*('text\/css'|"text\/css"|text\/css)\s*rel\s*=\s*('stylesheet'|"stylesheet"|stylesheet)\s*href\s*=\s*.*>)|(<\s*link\s*type\s*=\s*('text\/css'|"text\/css"|text\/css)\s*href\s*=\s*.*>)|(<\s*link\s*rel\s*=\s*('stylesheet'|"stylesheet"|stylesheet)\s*href\s*=\s*.*>)|(<\s*link\s*rel\s*=\s*('stylesheet'|"stylesheet"|stylesheet)\s*type\s*=\s*('text\/css'|"text\/css"|text\/css)\s*href\s*=\s*.*>)/g)[i].search(/href\s*=\s*(('.*')|(".*"))/g), content.match(/(<\s*link\s*type\s*=\s*('text\/css'|"text\/css"|text\/css)\s*rel\s*=\s*('stylesheet'|"stylesheet"|stylesheet)\s*href\s*=\s*.*>)|(<\s*link\s*type\s*=\s*('text\/css'|"text\/css"|text\/css)\s*href\s*=\s*.*>)|(<\s*link\s*rel\s*=\s*('stylesheet'|"stylesheet"|stylesheet)\s*href\s*=\s*.*>)|(<\s*link\s*rel\s*=\s*('stylesheet'|"stylesheet"|stylesheet)\s*type\s*=\s*('text\/css'|"text\/css"|text\/css)\s*href\s*=\s*.*>)/g)[i].search(/href\s*=\s*(('.*')|(".*"))/g) + content.match(/(<\s*link\s*type\s*=\s*('text\/css'|"text\/css"|text\/css)\s*rel\s*=\s*('stylesheet'|"stylesheet"|stylesheet)\s*href\s*=\s*.*>)|(<\s*link\s*type\s*=\s*('text\/css'|"text\/css"|text\/css)\s*href\s*=\s*.*>)|(<\s*link\s*rel\s*=\s*('stylesheet'|"stylesheet"|stylesheet)\s*href\s*=\s*.*>)|(<\s*link\s*rel\s*=\s*('stylesheet'|"stylesheet"|stylesheet)\s*type\s*=\s*('text\/css'|"text\/css"|text\/css)\s*href\s*=\s*.*>)/g)[i].length).replace(/("\s*>$)|('\s*>$)/g, "").replace(/^(href\s*=\s*("|'))/g, ""));
    }
    
    let classes = [];
    
    for(i = 0; i < stylesheets.length; i++) {
        let handle = cssParser.parse(FileSystem.readFileSync(stylesheets[i]).toString());
        for(j = 0; j < cssParser.getAllClasses(handle).length; j++) {
            classes.push(cssParser.getAllClasses(handle)[j].replace(/$./g, ""));
        }
    }
    stylesheets = classes;
    
    return stylesheets;
}

function extractNameAttribute(content, cursor) {
    let cursorIndex        = hInstance.indexFromPos(cursor);
    let mediaType          = "";
    let string = "";
    
    for(d = cursorIndex; d > 0; d--) {
        if(hInstance.getTokenAt(hInstance.posFromIndex(d)).type == "attribute" && hInstance.getTokenAt(hInstance.posFromIndex(d)).string == "name") {
            string = hInstance.getTokenAt(hInstance.posFromIndex(d + 3)).string;
            break;
        }
    }
    
    if(string.length != 0) {
        return string.toLowerCase();
    } else {
        return "empty";
    }
}

function gatherAllFormNames(content) {
    let tokens = [];
    let bId    = false;
    for(i = 0; i < content.length; i++) {
        if(bId == false && hInstance.getTokenTypeAt(hInstance.posFromIndex(i)) == "attribute" && hInstance.getTokenAt(hInstance.posFromIndex(i)).string == "name" && hInstance.getTokenAt(hInstance.posFromIndex(i)).state.htmlState.tagName.toLowerCase() == "form") {
            bId = true;
        }
        
        else if(bId == true && hInstance.getTokenTypeAt(hInstance.posFromIndex(i)) == "string") {
            tokens.push(hInstance.getTokenAt(hInstance.posFromIndex(i)).string.split("'").join("").split('"').join(""));
            bId = false;
        }
    }
    
    return tokens;
}

function gatherAllDatalistIDs(content) {
    let tokens = [];
    let bId    = false;
    for(i = 0; i < content.length; i++) {
        if(bId == false && hInstance.getTokenTypeAt(hInstance.posFromIndex(i)) == "attribute" && hInstance.getTokenAt(hInstance.posFromIndex(i)).string == "id" && hInstance.getTokenAt(hInstance.posFromIndex(i)).state.htmlState.tagName.toLowerCase() == "datalist") {
            bId = true;
        }
        
        else if(bId == true && hInstance.getTokenTypeAt(hInstance.posFromIndex(i)) == "string") {
            tokens.push(hInstance.getTokenAt(hInstance.posFromIndex(i)).string.split("'").join("").split('"').join(""));
            bId = false;
        }
    }
    
    return tokens;
}

function seeIfRegExpHTML(content, cursor) {
    for(d = hInstance.indexFromPos(cursor); d > 0; d--) {
        if(hInstance.getTokenTypeAt(hInstance.posFromIndex(d)) == "attribute") {
            if(hInstance.getTokenAt(hInstance.posFromIndex(d)).string.toLowerCase() == "pattern") {
                return 1;
            }
            
            break;
        }
    }
}

$(document).ready(function(e) {
    $('.CodeMirror').height($(window).height());
    $('.CodeMirror').width($(window).width());
    $('#_contextmenu').css("display", "none");
    
    for(i = 0; i < 500; i++) {
        MAX_TAGS.push(i);
    }
    
    $(".CodeMirror").on('keydown keypress keyup resize scroll', function() {
        $('.CodeMirror').height($(window).height());
        $('.CodeMirror').width($(window).width());
        $('#_contextmenu').css("display", "none");
    });
    
    $(window).resize(function() {
        $(".CodeMirror").height($(window).height());
        $(".CodeMirror").width($(window).width());
    });
    
    $(document).on("contextmenu", function(event) {
        $("#_list").css('display', 'none');
        
        event.preventDefault();
        bContextMenu = true;
        
        let x = "";
        let y = "";
        
        if($(".CodeMirror-cursor").length) {
            let xPos = document.getElementsByClassName('CodeMirror-cursor')[0].style.left;
            x = xPos.replace("px", "");
            x = parseFloat(x);
            x = x + 80;
            x = x + "px";

            let yPos = document.getElementsByClassName('CodeMirror-cursor')[0].style.top;
            y = yPos.replace("px", "");
            y = parseInt(y);
            y = y + 30;
            y = y + "px";
        } else {
            x = event.pageX + "px";
            y = event.pageY + "px";
        }
        
        let height = 247;
        
        $(".context-menu-wrapper").find("#_regex").first().remove();
        $(".context-menu-wrapper").find("#_regex_hr").first().remove();
        $(".context-menu").css("height", "247px");
        
        if(hInstance.getModeAt(hInstance.getCursor()).name == "xml" && extractTagName(hInstance.getValue(), hInstance.getCursor()) == "input" && seeIfRegExpHTML(hInstance.getValue(), hInstance.getCursor()) == 1 && hInstance.getTokenAt(hInstance.getCursor()).type == "string") {
            $(".context-menu-wrapper").append('<hr id="_regex_hr">');
            $(".context-menu-wrapper").append('<div id="_regex" class="context-menu-item" onclick="javascript:showRegExpComposer(); right: 0px; top: 245px;">RegExp composer<p style="float: right; padding-right: 5px;">Ctrl+Shift+R</p></div>');
            
            height = height + 63;
        }
        
        if(parseInt(y.replace("px", "")) > $(window).height() / 2) {
            $("#_contextmenu").css({
                "display": "block",
                "top"    : (parseInt(y.replace("px", "")) - 30 - height - $(".CodeMirror-scroll").scrollTop()) + "px",
                "height" : height + "px"
            });
        } else {
            $("#_contextmenu").css({
                "display": "block",
                "top"    : y,
                "height" : height + "px"
            });
        }
        
        if(parseInt(x.replace("px", "")) > $(window).width() / 2) {
            $("#_contextmenu").css({
                "display": "block",
                "left"   : (parseInt(x.replace("px", "")) - 300 - $(".CodeMirror-scroll").scrollLeft()) + "px",
                "height" : height + "px"
            });
        } else {
            $("#_contextmenu").css({
                "display": "block",
                "left"   : x,
                "height" : height + "px"
            });
        }
    });
    
    hInstance.on("keyup", function(editor, event) {
        if(event.ctrlKey && event.keyCode == 80){
            document.execCommand('print');
        }
        
        if(hInstance.getModeAt(hInstance.getCursor()).name != "xml" && hInstance.getModeAt(hInstance.getCursor()).name != "javascript" && hInstance.getModeAt(hInstance.getCursor()).name != "css" && hInstance.getModeAt(hInstance.getCursor()).name != "php" && hInstance.getModeAt(hInstance.getCursor()).name != "ruby" && hInstance.getModeAt(hInstance.getCursor()).name != "python") { $("#_list").css("display", "none"); }
        
        if(hInstance.getModeAt(hInstance.getCursor()).name == "xml") {
            let avaibleTags = [];
            let avaibleAtts = [];
            let avaibleStrs = [];
            let avaibleAtms = [];

            if(hInstance.getTokenAt(hInstance.getCursor()).type == "tag") {
                let cursor = hInstance.getCursor();
                let token = hInstance.getTokenAt(cursor);
                
                avaibleTags = filter(htmlTags, token.string, true);
                
                if(avaibleTags[0] == "") {
                    $("#_list").css("display", "none");
                }

                currentTokenType = "tag";
                
                let arrayTypes = [];
                for(i = 0; i < avaibleTags.length; i++) {
                    arrayTypes[i] = "tag";
                }
                
                displayAutocomplete(avaibleTags, arrayTypes);
            } if(avaibleTags[0] == "") {
                $("#_list").css("display", "none");
            }
            
            if(hInstance.getTokenAt(hInstance.getCursor()).type == "attribute") {
                let tagName = extractTagName(hInstance.getValue(), hInstance.getCursor());
                
                let atts = htmlAtts[tagName.toLowerCase() + "Atts"];
                
                let cursor = hInstance.getCursor();
                let token = hInstance.getTokenAt(cursor);
                
                avaibleAtts = filter(atts, token.string, true);
                
                if(avaibleAtts[0] == "") {
                    $("#_list").css("display", "none");
                }

                currentTokenType = "attribute";
                
                let arrayTypes = [];
                for(i = 0; i < avaibleAtts.length; i++) {
                    arrayTypes[i] = "attribute";
                }
                
                displayAutocomplete(avaibleAtts, arrayTypes);
            } if(avaibleAtts[0] == "") {
                $("#_list").css("display", "none");
            }
            
            if(hInstance.getTokenAt(hInstance.getCursor()).type == "string") {
                let attributeName = extractAttributeName(hInstance.getValue(), hInstance.getCursor());
                if(attributeName == "src") {
                    let token = hInstance.getTokenAt(hInstance.getCursor());
                    let tokenString  = token.string.slice(1, token.string.length - 1);
                    
                    if(tokenString.search("/") != -1 || tokenString.search(/\\/g) != -1) {
                        let path     = "";
                        let fname    = "";
                        
                        tokenString = tokenString.split("\\").join("/");
                        
                        if(tokenString.search("/") != -1) {
                            path  = tokenString.substring(0, tokenString.lastIndexOf("/") + 1);
                            fname = tokenString.slice(tokenString.lastIndexOf("/") + 1, tokenString.length);
                        }
                        
                        let existingFiles = [];
                        
                        FileSystem.readdirSync(path).forEach(file => {
                            existingFiles.push(file);
                        });
                        
                        let filtredExistingFiles = [];
                        
                        if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "script") {
                            for(i = 0; i < existingFiles.length; i++) {
                                if(FileSystem.lstatSync(path + existingFiles[i]).isFile()) {
                                    if(existingFiles[i].endsWith(".vbs") || existingFiles[i].endsWith(".vb") || existingFiles[i].endsWith(".cs") || existingFiles[i].endsWith(".coffee") || existingFiles[i].endsWith(".litcoffee") || existingFiles[i].endsWith(".js") || existingFiles[i].endsWith(".ts") || existingFiles[i].endsWith(".ls")) {
                                        filtredExistingFiles.push(existingFiles[i]);
                                    }
                                } else {
                                    filtredExistingFiles.push(existingFiles[i]);
                                }
                            }
                        } else if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "iframe" || extractTagName(hInstance.getValue(), hInstance.getCursor()) == "embed" || extractTagName(hInstance.getValue(), hInstance.getCursor()) == "source") {
                            for(i = 0; i < existingFiles.length; i++) {
                                filtredExistingFiles.push(existingFiles[i]);
                            }
                        } else if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "audio") {
                            for(i = 0; i < existingFiles.length; i++) {
                                if(FileSystem.lstatSync(path + existingFiles[i]).isFile()) {
                                    if(existingFiles[i].endsWith(".wav") || existingFiles[i].endsWith(".mp3") || existingFiles[i].endsWith(".ogg")) {
                                        filtredExistingFiles.push(existingFiles[i]);
                                    }
                                } else {
                                    filtredExistingFiles.push(existingFiles[i]);
                                }
                            }
                        } else if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "img") {
                            for(i = 0; i < existingFiles.length; i++) {
                                if(FileSystem.lstatSync(path + existingFiles[i]).isFile()) {
                                    if(existingFiles[i].endsWith(".png") || existingFiles[i].endsWith(".bmp") || existingFiles[i].endsWith(".jpg") || existingFiles[i].endsWith(".ico")) {
                                        filtredExistingFiles.push(existingFiles[i]);
                                    }
                                } else {
                                    filtredExistingFiles.push(existingFiles[i]);
                                }
                            }
                        } else if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "input" && hasAttributeWithValue(hInstance.getValue(), hInstance.getCursor(), "type", "image")) {
                            for(i = 0; i < existingFiles.length; i++) {
                                filtredExistingFiles.push(existingFiles[i]);
                            }
                        } else if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "track") {
                            for(i = 0; i < existingFiles.length; i++) {
                                if(FileSystem.lstatSync(path + existingFiles[i]).isFile()) {
                                    if(existingFiles[i].endsWith(".vtt")) {
                                        filtredExistingFiles.push(existingFiles[i]);
                                    }
                                } else {
                                    filtredExistingFiles.push(existingFiles[i]);
                                }
                            }
                        } else if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "video") {
                            for(i = 0; i < existingFiles.length; i++) {
                                if(FileSystem.lstatSync(path + existingFiles[i]).isFile()) {
                                    if(existingFiles[i].endsWith(".wmv") || existingFiles[i].endsWith(".mp4") || existingFiles[i].endsWith(".avi") || existingFiles[i].endsWith(".mov")) {
                                        filtredExistingFiles.push(existingFiles[i]);
                                    }
                                } else {
                                    filtredExistingFiles.push(existingFiles[i]);
                                }
                            }
                        }
                        
                        avaibleStrs = filter(filtredExistingFiles, fname, true);
                        
                        let arrayTypes = [];
                        for(i = 0; i < avaibleStrs.length; i++) {
                            arrayTypes[i] = "string";
                        }
                        
                        currentTokenType = "path";
                        
                        displayAutocomplete(avaibleStrs, arrayTypes);
                    } else {
                        let existingFiles = [];
                        
                        FileSystem.readdirSync("./").forEach(file => {
                            existingFiles.push(file);
                        });
                        
                        let filtredExistingFiles = [];
                        
                        if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "script") {
                            for(i = 0; i < existingFiles.length; i++) {
                                if(FileSystem.lstatSync(existingFiles[i]).isFile()) {
                                    if(existingFiles[i].endsWith(".vbs") || existingFiles[i].endsWith(".vb") || existingFiles[i].endsWith(".cs") || existingFiles[i].endsWith(".coffee") || existingFiles[i].endsWith(".litcoffee") || existingFiles[i].endsWith(".js") || existingFiles[i].endsWith(".ts") || existingFiles[i].endsWith(".ls")) {
                                        filtredExistingFiles.push(existingFiles[i]);
                                    }
                                } else {
                                    filtredExistingFiles.push(existingFiles[i]);
                                }
                            }
                        } else if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "iframe" || extractTagName(hInstance.getValue(), hInstance.getCursor()) == "embed" || extractTagName(hInstance.getValue(), hInstance.getCursor()) == "source") {
                            for(i = 0; i < existingFiles.length; i++) {
                                filtredExistingFiles.push(existingFiles[i]);
                            }
                        } else if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "audio") {
                            for(i = 0; i < existingFiles.length; i++) {
                                if(FileSystem.lstatSync(existingFiles[i]).isFile()) {
                                    if(existingFiles[i].endsWith(".wav") || existingFiles[i].endsWith(".mp3") || existingFiles[i].endsWith(".ogg")) {
                                        filtredExistingFiles.push(existingFiles[i]);
                                    }
                                } else {
                                    filtredExistingFiles.push(existingFiles[i]);
                                }
                            }
                        } else if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "img") {
                            for(i = 0; i < existingFiles.length; i++) {
                                if(FileSystem.lstatSync(existingFiles[i]).isFile()) {
                                    if(existingFiles[i].endsWith(".png") || existingFiles[i].endsWith(".bmp") || existingFiles[i].endsWith(".jpg") || existingFiles[i].endsWith(".ico")) {
                                        filtredExistingFiles.push(existingFiles[i]);
                                    }
                                } else {
                                    filtredExistingFiles.push(existingFiles[i]);
                                }
                            }
                        } else if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "input" && hasAttributeWithValue(hInstance.getValue(), hInstance.getCursor(), "type", "image")) {
                            for(i = 0; i < existingFiles.length; i++) {
                                filtredExistingFiles.push(existingFiles[i]);
                            }
                        } else if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "track") {
                            for(i = 0; i < existingFiles.length; i++) {
                                if(FileSystem.lstatSync(existingFiles[i]).isFile()) {
                                    if(existingFiles[i].endsWith(".vtt")) {
                                        filtredExistingFiles.push(existingFiles[i]);
                                    }
                                } else {
                                    filtredExistingFiles.push(existingFiles[i]);
                                }
                            }
                        } else if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "video") {
                            for(i = 0; i < existingFiles.length; i++) {
                                if(FileSystem.lstatSync(existingFiles[i]).isFile()) {
                                    if(existingFiles[i].endsWith(".wmv") || existingFiles[i].endsWith(".mp4") || existingFiles[i].endsWith(".avi") || existingFiles[i].endsWith(".mov")) {
                                        filtredExistingFiles.push(existingFiles[i]);
                                    }
                                } else {
                                    filtredExistingFiles.push(existingFiles[i]);
                                }
                            }
                        }
                        
                        avaibleStrs = filter(filtredExistingFiles, tokenString, true);
                        
                        let arrayTypes = [];
                        for(i = 0; i < avaibleStrs.length; i++) {
                            arrayTypes[i] = "string";
                        }
                        
                        currentTokenType = "path";
                        
                        displayAutocomplete(avaibleStrs, arrayTypes);
                    }
                } else if(attributeName == "data") {
                    let token = hInstance.getTokenAt(hInstance.getCursor());
                    let tokenString  = token.string.slice(1, token.string.length - 1);
                    
                    if(tokenString.search("/") != -1 || tokenString.search(/\\/g) != -1) {
                        let path     = "";
                        let fname    = "";
                        
                        tokenString = tokenString.split("\\").join("/");
                        
                        if(tokenString.search("/") != -1) {
                            path  = tokenString.substring(0, tokenString.lastIndexOf("/") + 1);
                            fname = tokenString.slice(tokenString.lastIndexOf("/") + 1, tokenString.length);
                        }
                        
                        let existingFiles = [];
                        
                        FileSystem.readdirSync(path).forEach(file => {
                            existingFiles.push(file);
                        });
                        
                        let filtredExistingFiles = [];
                        
                        if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "object") {
                            for(i = 0; i < existingFiles.length; i++) {
                                filtredExistingFiles.push(existingFiles[i]);
                            }
                        }
                        
                        avaibleStrs = filter(filtredExistingFiles, fname, true);
                        
                        let arrayTypes = [];
                        for(i = 0; i < avaibleStrs.length; i++) {
                            arrayTypes[i] = "string";
                        }
                        
                        currentTokenType = "path";
                        
                        displayAutocomplete(avaibleStrs, arrayTypes);
                    } else {
                        let existingFiles = [];
                        
                        FileSystem.readdirSync("./").forEach(file => {
                            existingFiles.push(file);
                        });
                        
                        let filtredExistingFiles = [];
                        
                        if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "object") {
                            for(i = 0; i < existingFiles.length; i++) {
                                filtredExistingFiles.push(existingFiles[i]);
                            }
                        }
                        
                        avaibleStrs = filter(filtredExistingFiles, tokenString, true);
                        
                        let arrayTypes = [];
                        for(i = 0; i < avaibleStrs.length; i++) {
                            arrayTypes[i] = "string";
                        }
                        
                        currentTokenType = "path";
                        
                        displayAutocomplete(avaibleStrs, arrayTypes);
                    }
                } else if(attributeName == "href") {
                    let sections = gatherAllIDs(hInstance.getValue());
                    let token = hInstance.getTokenAt(hInstance.getCursor());
                    let tokenString  = token.string.slice(1, token.string.length - 1);
                    
                    if(tokenString.search("/") != -1 || tokenString.search(/\\/g) != -1) {
                        let path     = "";
                        let fname    = "";
                        
                        tokenString = tokenString.split("\\").join("/");
                        
                        if(tokenString.search("/") != -1) {
                            path  = tokenString.substring(0, tokenString.lastIndexOf("/") + 1);
                            fname = tokenString.slice(tokenString.lastIndexOf("/") + 1, tokenString.length);
                        }
                        
                        let existingFiles = [];
                        
                        FileSystem.readdirSync(path).forEach(file => {
                            existingFiles.push(file);
                        });
                        
                        let filtredExistingFiles = [];
                        if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == 'link') {
                            if(extractMediaTypeFromLink(hInstance.getValue(), hInstance.getCursor()).split("'").join('"') == '"stylesheet"') {
                                for(i = 0; i < existingFiles.length; i++) {
                                    if(FileSystem.lstatSync(path + existingFiles[i]).isFile()) {
                                        if(existingFiles[i].endsWith(".css")) {
                                            filtredExistingFiles.push(existingFiles[i]);
                                        }
                                    } else {
                                        filtredExistingFiles.push(existingFiles[i]);
                                    }
                                }
                            } else if(extractMediaTypeFromLink(hInstance.getValue(), hInstance.getCursor()).split("'").join('"') == '"alternate"') {
                                for(i = 0; i < existingFiles.length; i++) {
                                    filtredExistingFiles.push(existingFiles[i]);
                                }
                            } else if(extractMediaTypeFromLink(hInstance.getValue(), hInstance.getCursor()).split("'").join('"') == '"author"') {
                                for(i = 0; i < existingFiles.length; i++) {
                                    filtredExistingFiles.push(existingFiles[i]);
                                }
                            } else if(extractMediaTypeFromLink(hInstance.getValue(), hInstance.getCursor()).split("'").join('"') == '"help"') {
                                for(i = 0; i < existingFiles.length; i++) {
                                    if(FileSystem.lstatSync(path + existingFiles[i]).isFile()) {
                                        if(existingFiles[i].endsWith(".html") || existingFiles[i].endsWith(".htm") || existingFiles[i].endsWith(".asp")) {
                                            filtredExistingFiles.push(existingFiles[i]);
                                        }
                                    } else {
                                        filtredExistingFiles.push(existingFiles[i]);
                                    }
                                }
                            } else if(extractMediaTypeFromLink(hInstance.getValue(), hInstance.getCursor()).split("'").join('"') == '"icon"') {
                                for(i = 0; i < existingFiles.length; i++) {
                                    if(FileSystem.lstatSync(path + existingFiles[i]).isFile()) {
                                        if(existingFiles[i].endsWith(".ico") || existingFiles[i].endsWith(".bmp") || existingFiles[i].endsWith(".png") || existingFiles[i].endsWith(".jpg")) {
                                            filtredExistingFiles.push(existingFiles[i]);
                                        }
                                    } else {
                                        filtredExistingFiles.push(existingFiles[i]);
                                    }
                                }
                            } else if(extractMediaTypeFromLink(hInstance.getValue(), hInstance.getCursor()).split("'").join('"') == '"license"') {
                                for(i = 0; i < existingFiles.length; i++) {
                                    filtredExistingFiles.push(existingFiles[i]);
                                }
                            } else if(extractMediaTypeFromLink(hInstance.getValue(), hInstance.getCursor()).split("'").join('"') == '"help"') {
                                for(i = 0; i < existingFiles.length; i++) {
                                    if(FileSystem.lstatSync(path + existingFiles[i]).isFile()) {
                                        if(existingFiles[i].endsWith(".html") || existingFiles[i].endsWith(".htm") || existingFiles[i].endsWith(".asp")) {
                                            filtredExistingFiles.push(existingFiles[i]);
                                        }
                                    } else {
                                        filtredExistingFiles.push(existingFiles[i]);
                                    }
                                }
                            } else if(extractMediaTypeFromLink(hInstance.getValue(), hInstance.getCursor()) == "empty") {
                                for(i = 0; i < existingFiles.length; i++) {
                                    filtredExistingFiles.push(existingFiles[i]);
                                }
                            }
                        } else if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "a") {
                            for(i = 0; i < existingFiles.length; i++) {
                                filtredExistingFiles.push(existingFiles[i]);
                            }
                        } else if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "area" || extractTagName(hInstance.getValue(), hInstance.getCursor()) == "base") {
                            for(i = 0; i < existingFiles.length; i++) {
                                if(FileSystem.lstatSync(path + existingFiles[i]).isFile()) {
                                    if(existingFiles[i].endsWith(".html") || existingFiles[i].endsWith(".htm") || existingFiles[i].endsWith(".asp")) {
                                        filtredExistingFiles.push(existingFiles[i]);
                                    }
                                } else {
                                    filtredExistingFiles.push(existingFiles[i]);
                                }
                            }
                        }
                        
                        if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "a") {
                            for(i = 0; i < sections.length; i++) {
                                filtredExistingFiles.push(sections[i]);
                            }
                        }
                        
                        filtredExistingFiles = filtredExistingFiles.sort();
                        
                        avaibleStrs = filter(filtredExistingFiles, fname, true);
                        
                        let arrayTypes = [];
                        if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "a") {
                            for(i = 0; i < avaibleStrs.length; i++) {
                                if(avaibleStrs[i].startsWith("#")) {
                                    arrayTypes[i] = "section";
                                } else {
                                    arrayTypes[i] = "string";
                                }
                            }
                        } else {
                            for(i = 0; i < avaibleStrs.length; i++) {
                                arrayTypes[i] = "string";
                            }
                        }
                        
                        currentTokenType = "path";
                        
                        displayAutocomplete(avaibleStrs, arrayTypes);
                    } else {
                        let existingFiles = [];
                        
                        FileSystem.readdirSync("./").forEach(file => {
                            existingFiles.push(file);
                        });
                        
                        let filtredExistingFiles = [];
                        if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == 'link') {
                            if(extractMediaTypeFromLink(hInstance.getValue(), hInstance.getCursor()).split("'").join('"') == '"stylesheet"') {
                                for(i = 0; i < existingFiles.length; i++) {
                                    if(FileSystem.lstatSync(existingFiles[i]).isFile()) {
                                        if(existingFiles[i].endsWith(".css")) {
                                            filtredExistingFiles.push(existingFiles[i]);
                                        }
                                    } else {
                                        filtredExistingFiles.push(existingFiles[i]);
                                    }
                                }
                            } else if(extractMediaTypeFromLink(hInstance.getValue(), hInstance.getCursor()).split("'").join('"') == '"alternate"') {
                                for(i = 0; i < existingFiles.length; i++) {
                                    filtredExistingFiles.push(existingFiles[i]);
                                }
                            } else if(extractMediaTypeFromLink(hInstance.getValue(), hInstance.getCursor()).split("'").join('"') == '"author"') {
                                for(i = 0; i < existingFiles.length; i++) {
                                    filtredExistingFiles.push(existingFiles[i]);
                                }
                            } else if(extractMediaTypeFromLink(hInstance.getValue(), hInstance.getCursor()).split("'").join('"') == '"help"') {
                                for(i = 0; i < existingFiles.length; i++) {
                                    if(FileSystem.lstatSync(existingFiles[i]).isFile()) {
                                        if(existingFiles[i].endsWith(".html") || existingFiles[i].endsWith(".htm") || existingFiles[i].endsWith(".asp")) {
                                            filtredExistingFiles.push(existingFiles[i]);
                                        }
                                    } else {
                                        filtredExistingFiles.push(existingFiles[i]);
                                    }
                                }
                            } else if(extractMediaTypeFromLink(hInstance.getValue(), hInstance.getCursor()).split("'").join('"') == '"icon"') {
                                for(i = 0; i < existingFiles.length; i++) {
                                    if(FileSystem.lstatSync(existingFiles[i]).isFile()) {
                                        if(existingFiles[i].endsWith(".ico") || existingFiles[i].endsWith(".bmp") || existingFiles[i].endsWith(".png") || existingFiles[i].endsWith(".jpg")) {
                                            filtredExistingFiles.push(existingFiles[i]);
                                        }
                                    } else {
                                        filtredExistingFiles.push(existingFiles[i]);
                                    }
                                }
                            } else if(extractMediaTypeFromLink(hInstance.getValue(), hInstance.getCursor()).split("'").join('"') == '"license"') {
                                for(i = 0; i < existingFiles.length; i++) {
                                    filtredExistingFiles.push(existingFiles[i]);
                                }
                            } else if(extractMediaTypeFromLink(hInstance.getValue(), hInstance.getCursor()).split("'").join('"') == '"help"') {
                                for(i = 0; i < existingFiles.length; i++) {
                                    if(FileSystem.lstatSync(existingFiles[i]).isFile()) {
                                        if(existingFiles[i].endsWith(".html") || existingFiles[i].endsWith(".htm") || existingFiles[i].endsWith(".asp")) {
                                            filtredExistingFiles.push(existingFiles[i]);
                                        }
                                    } else {
                                        filtredExistingFiles.push(existingFiles[i]);
                                    }
                                }
                            } else if(extractMediaTypeFromLink(hInstance.getValue(), hInstance.getCursor()) == "empty") {
                                for(i = 0; i < existingFiles.length; i++) {
                                    filtredExistingFiles.push(existingFiles[i]);
                                }
                            }
                        } else if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "a") {
                            for(i = 0; i < existingFiles.length; i++) {
                                filtredExistingFiles.push(existingFiles[i]);
                            }
                        } else if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "area" || extractTagName(hInstance.getValue(), hInstance.getCursor()) == "base") {
                            for(i = 0; i < existingFiles.length; i++) {
                                if(FileSystem.lstatSync(existingFiles[i]).isFile()) {
                                    if(existingFiles[i].endsWith(".html") || existingFiles[i].endsWith(".htm") || existingFiles[i].endsWith(".asp")) {
                                        filtredExistingFiles.push(existingFiles[i]);
                                    }
                                } else {
                                    filtredExistingFiles.push(existingFiles[i]);
                                }
                            }
                        }
                        
                        if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "a") {
                            for(i = 0; i < sections.length; i++) {
                                filtredExistingFiles.push(sections[i]);
                            }
                        }
                        
                        filtredExistingFiles = filtredExistingFiles.sort();
                        
                        avaibleStrs = filter(filtredExistingFiles, tokenString, true);
                        
                        let arrayTypes = [];
                        if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "a") {
                            for(i = 0; i < avaibleStrs.length; i++) {
                                if(avaibleStrs[i].startsWith("#")) {
                                    arrayTypes[i] = "section";
                                } else {
                                    arrayTypes[i] = "string";
                                }
                            }
                        } else {
                            for(i = 0; i < avaibleStrs.length; i++) {
                                arrayTypes[i] = "string";
                            }
                        }
                        
                        currentTokenType = "path";
                        
                        displayAutocomplete(avaibleStrs, arrayTypes);
                    }
                } else if(attributeName == "download") {
                    let token = hInstance.getTokenAt(hInstance.getCursor());
                    let tokenString  = token.string.slice(1, token.string.length - 1);
                    
                    if(tokenString.search("/") != -1 || tokenString.search(/\\/g) != -1) {
                        let path     = "";
                        let fname    = "";
                        
                        tokenString = tokenString.split("\\").join("/");
                        
                        if(tokenString.search("/") != -1) {
                            path  = tokenString.substring(0, tokenString.lastIndexOf("/") + 1);
                            fname = tokenString.slice(tokenString.lastIndexOf("/") + 1, tokenString.length);
                        }
                        
                        let existingFiles = [];
                        
                        FileSystem.readdirSync(path).forEach(file => {
                            existingFiles.push(file);
                        });
                        
                        let filtredExistingFiles = [];
                        if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "a") {
                            for(i = 0; i < existingFiles.length; i++) {
                                filtredExistingFiles.push(existingFiles[i]);
                            }
                        } else if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "area") {
                            for(i = 0; i < existingFiles.length; i++) {
                                filtredExistingFiles.push(existingFiles[i]);
                            }
                        }
                        
                        filtredExistingFiles = filtredExistingFiles.sort();
                        
                        avaibleStrs = filter(filtredExistingFiles, fname, true);
                        
                        let arrayTypes = [];
                        for(i = 0; i < avaibleStrs.length; i++) {
                            arrayTypes[i] = "string";
                        }
                        
                        currentTokenType = "path";
                        
                        displayAutocomplete(avaibleStrs, arrayTypes);
                    } else {
                        let existingFiles = [];
                        
                        FileSystem.readdirSync("./").forEach(file => {
                            existingFiles.push(file);
                        });
                        
                        let filtredExistingFiles = [];
                        if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "a") {
                            for(i = 0; i < existingFiles.length; i++) {
                                filtredExistingFiles.push(existingFiles[i]);
                            }
                        } else if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "area") {
                            for(i = 0; i < existingFiles.length; i++) {
                                filtredExistingFiles.push(existingFiles[i]);
                            }
                        }
                        
                        filtredExistingFiles = filtredExistingFiles.sort();
                        
                        avaibleStrs = filter(filtredExistingFiles, tokenString, true);
                        
                        let arrayTypes = [];
                        for(i = 0; i < avaibleStrs.length; i++) {
                            arrayTypes[i] = "string";
                        }
                        
                        currentTokenType = "path";
                        
                        displayAutocomplete(avaibleStrs, arrayTypes);
                    }
                } else if(attributeName == "action") {
                    let token = hInstance.getTokenAt(hInstance.getCursor());
                    let tokenString  = token.string.slice(1, token.string.length - 1);
                    
                    if(tokenString.search("/") != -1 || tokenString.search(/\\/g) != -1) {
                        let path     = "";
                        let fname    = "";
                        
                        tokenString = tokenString.split("\\").join("/");
                        
                        if(tokenString.search("/") != -1) {
                            path  = tokenString.substring(0, tokenString.lastIndexOf("/") + 1);
                            fname = tokenString.slice(tokenString.lastIndexOf("/") + 1, tokenString.length);
                        }
                        
                        let existingFiles = [];
                        
                        FileSystem.readdirSync(path).forEach(file => {
                            existingFiles.push(file);
                        });
                        
                        let filtredExistingFiles = [];
                        if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "form") {
                            for(i = 0; i < existingFiles.length; i++) {
                                if(FileSystem.lstatSync(path + existingFiles[i]).isFile()) {
                                    if(existingFiles[i].endsWith(".php")) {
                                        filtredExistingFiles.push(existingFiles[i]);
                                    }
                                } else {
                                    filtredExistingFiles.push(existingFiles[i]);
                                }
                            }
                        }
                        
                        filtredExistingFiles = filtredExistingFiles.sort();
                        
                        avaibleStrs = filter(filtredExistingFiles, fname, true);
                        
                        let arrayTypes = [];
                        for(i = 0; i < avaibleStrs.length; i++) {
                            arrayTypes[i] = "string";
                        }
                        
                        currentTokenType = "path";
                        
                        displayAutocomplete(avaibleStrs, arrayTypes);
                    } else {
                        let existingFiles = [];
                        
                        FileSystem.readdirSync("./").forEach(file => {
                            existingFiles.push(file);
                        });
                        
                        let filtredExistingFiles = [];
                        if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "form") {
                            for(i = 0; i < existingFiles.length; i++) {
                                if(FileSystem.lstatSync(existingFiles[i]).isFile()) {
                                    if(existingFiles[i].endsWith(".php")) {
                                        filtredExistingFiles.push(existingFiles[i]);
                                    }
                                } else {
                                    filtredExistingFiles.push(existingFiles[i]);
                                }
                            }
                        }
                        
                        filtredExistingFiles = filtredExistingFiles.sort();
                        
                        avaibleStrs = filter(filtredExistingFiles, tokenString, true);
                        
                        let arrayTypes = [];
                        for(i = 0; i < avaibleStrs.length; i++) {
                            arrayTypes[i] = "string";
                        }
                        
                        currentTokenType = "path";
                        
                        displayAutocomplete(avaibleStrs, arrayTypes);
                    }
                } else if(attributeName == "cite") {
                    let token = hInstance.getTokenAt(hInstance.getCursor());
                    let tokenString  = token.string.slice(1, token.string.length - 1);
                    
                    if(tokenString.search("/") != -1 || tokenString.search(/\\/g) != -1) {
                        let path     = "";
                        let fname    = "";
                        
                        tokenString = tokenString.split("\\").join("/");
                        
                        if(tokenString.search("/") != -1) {
                            path  = tokenString.substring(0, tokenString.lastIndexOf("/") + 1);
                            fname = tokenString.slice(tokenString.lastIndexOf("/") + 1, tokenString.length);
                        }
                        
                        let existingFiles = [];
                        
                        FileSystem.readdirSync(path).forEach(file => {
                            existingFiles.push(file);
                        });
                        
                        let filtredExistingFiles = [];
                        if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "blockquote" || extractTagName(hInstance.getValue(), hInstance.getCursor()) == "del" || extractTagName(hInstance.getValue(), hInstance.getCursor()) == "ins" || extractTagName(hInstance.getValue(), hInstance.getCursor()) == "q") {
                            for(i = 0; i < existingFiles.length; i++) {
                                if(FileSystem.lstatSync(path + existingFiles[i]).isFile()) {
                                    if(existingFiles[i].endsWith(".html") || existingFiles[i].endsWith(".htm") || existingFiles[i].endsWith(".asp") || existingFiles[i].endsWith(".aspx")) {
                                        filtredExistingFiles.push(existingFiles[i]);
                                    }
                                } else {
                                    filtredExistingFiles.push(existingFiles[i]);
                                }
                            }
                        }
                        
                        filtredExistingFiles = filtredExistingFiles.sort();
                        
                        avaibleStrs = filter(filtredExistingFiles, fname, true);
                        
                        let arrayTypes = [];
                        for(i = 0; i < avaibleStrs.length; i++) {
                            arrayTypes[i] = "string";
                        }
                        
                        currentTokenType = "path";
                        
                        displayAutocomplete(avaibleStrs, arrayTypes);
                    } else {
                        let existingFiles = [];
                        
                        FileSystem.readdirSync("./").forEach(file => {
                            existingFiles.push(file);
                        });
                        
                        let filtredExistingFiles = [];
                        if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "blockquote" || extractTagName(hInstance.getValue(), hInstance.getCursor()) == "del" || extractTagName(hInstance.getValue(), hInstance.getCursor()) == "ins" || extractTagName(hInstance.getValue(), hInstance.getCursor()) == "q") {
                            for(i = 0; i < existingFiles.length; i++) {
                                if(FileSystem.lstatSync(existingFiles[i]).isFile()) {
                                    if(existingFiles[i].endsWith(".html") || existingFiles[i].endsWith(".htm") || existingFiles[i].endsWith(".asp") || existingFiles[i].endsWith(".aspx")) {
                                        filtredExistingFiles.push(existingFiles[i]);
                                    }
                                } else {
                                    filtredExistingFiles.push(existingFiles[i]);
                                }
                            }
                        }
                        
                        filtredExistingFiles = filtredExistingFiles.sort();
                        
                        avaibleStrs = filter(filtredExistingFiles, tokenString, true);
                        
                        let arrayTypes = [];
                        for(i = 0; i < avaibleStrs.length; i++) {
                            arrayTypes[i] = "string";
                        }
                        
                        currentTokenType = "path";
                        
                        displayAutocomplete(avaibleStrs, arrayTypes);
                    }
                } else if(attributeName == "formaction") {
                    let token = hInstance.getTokenAt(hInstance.getCursor());
                    let tokenString  = token.string.slice(1, token.string.length - 1);
                    
                    if(tokenString.search("/") != -1 || tokenString.search(/\\/g) != -1) {
                        let path     = "";
                        let fname    = "";
                        
                        tokenString = tokenString.split("\\").join("/");
                        
                        if(tokenString.search("/") != -1) {
                            path  = tokenString.substring(0, tokenString.lastIndexOf("/") + 1);
                            fname = tokenString.slice(tokenString.lastIndexOf("/") + 1, tokenString.length);
                        }
                        
                        let existingFiles = [];
                        
                        FileSystem.readdirSync(path).forEach(file => {
                            existingFiles.push(file);
                        });
                        
                        let filtredExistingFiles = [];
                        if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "button" && hasAttributeWithValue(hInstance.getValue(), hInstance.getCursor(), "type", "submit") || extractTagName(hInstance.getValue(), hInstance.getCursor()) == "input" && hasAttributeWithValue(hInstance.getValue(), hInstance.getCursor(), "type", "submit")) {
                            for(i = 0; i < existingFiles.length; i++) {
                                if(FileSystem.lstatSync(path + existingFiles[i]).isFile()) {
                                    if(existingFiles[i].endsWith(".php")) {
                                        filtredExistingFiles.push(existingFiles[i]);
                                    }
                                } else {
                                    filtredExistingFiles.push(existingFiles[i]);
                                }
                            }
                        }
                        
                        filtredExistingFiles = filtredExistingFiles.sort();
                        
                        avaibleStrs = filter(filtredExistingFiles, fname, true);
                        
                        let arrayTypes = [];
                        for(i = 0; i < avaibleStrs.length; i++) {
                            arrayTypes[i] = "string";
                        }
                        
                        currentTokenType = "path";
                        
                        displayAutocomplete(avaibleStrs, arrayTypes);
                    } else {
                        let existingFiles = [];
                        
                        FileSystem.readdirSync("./").forEach(file => {
                            existingFiles.push(file);
                        });
                        
                        let filtredExistingFiles = [];
                        if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "button" && hasAttributeWithValue(hInstance.getValue(), hInstance.getCursor(), "type", "submit") || extractTagName(hInstance.getValue(), hInstance.getCursor()) == "input" && hasAttributeWithValue(hInstance.getValue(), hInstance.getCursor(), "type", "submit")) {
                            for(i = 0; i < existingFiles.length; i++) {
                                if(FileSystem.lstatSync(existingFiles[i]).isFile()) {
                                    if(existingFiles[i].endsWith(".php")) {
                                        filtredExistingFiles.push(existingFiles[i]);
                                    }
                                } else {
                                    filtredExistingFiles.push(existingFiles[i]);
                                }
                            }
                        }
                        
                        filtredExistingFiles = filtredExistingFiles.sort();
                        
                        avaibleStrs = filter(filtredExistingFiles, tokenString, true);
                        
                        let arrayTypes = [];
                        for(i = 0; i < avaibleStrs.length; i++) {
                            arrayTypes[i] = "string";
                        }
                        
                        currentTokenType = "path";
                        
                        displayAutocomplete(avaibleStrs, arrayTypes);
                    }
                } else if(attributeName == "rel") {
                    let token = hInstance.getTokenAt(hInstance.getCursor());
                    let tokenString  = token.string.slice(1, token.string.length - 1);
                    
                    if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "link") {
                        avaibleStrs = ["alternate", "author", "dns-prefetch", "help", "icon", "license", "next", "pingback", "preconnect", "prefetch", "preload", "prerender", "prev", "search", "stylesheet"];
                    } else if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "a" || extractTagName(hInstance.getValue(), hInstance.getCursor()) == "area") {
                        avaibleStrs = ["alternate", "author", "bookmark", "external", "help", "license", "next", "nofollow", "noreferrer", "noopener", "prev", "search", "tag"];
                    }
                    
                    avaibleStrs = filter(avaibleStrs, tokenString, true);
                    
                    let arrayTypes = [];
                    for(i = 0; i < avaibleStrs.length; i++) {
                        arrayTypes[i] = "string";
                    }
                    
                    currentTokenType = "string";
                    
                    displayAutocomplete(avaibleStrs, arrayTypes);
                } else if(attributeName == "type") {
                    let token = hInstance.getTokenAt(hInstance.getCursor());
                    let tokenString  = token.string.slice(1, token.string.length - 1);
                    
                    if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "a" || extractTagName(hInstance.getValue(), hInstance.getCursor()) == "link" || extractTagName(hInstance.getValue(), hInstance.getCursor()) == "embed" || extractTagName(hInstance.getValue(), hInstance.getCursor()) == "object" || extractTagName(hInstance.getValue(), hInstance.getCursor()) == "script" || extractTagName(hInstance.getValue(), hInstance.getCursor()) == "source") {
                        avaibleStrs = FileSystem.readFileSync("HTMLMime.dat").toString().split("\n");
                    } else if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "button") {
                        avaibleStrs = ["button", "reset", "submit"];
                    } else if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "input") {
                        avaibleStrs = ["button", "checkbox", "color", "date", "datetime-local", "email", "file", "hidden", "image", "month", "number", "password", "radio", "range", "reset", "search", "submit", "tel", "text", "url", "week"];
                    } else if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "menu") {
                        avaibleStrs = ["list", "toolbar", "context"];
                    } else if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "style" && event.keyCode != 16 && event.keyCode != 38 && event.keyCode != 40 && event.keyCode != 39 && event.keyCode != 37 && event.keyCode != 17 && event.keyCode != 144 && event.keyCode != 93 && event.keyCode != 20 && event.keyCode != 27 && event.keyCode != 112 && event.keyCode != 45 && event.keyCode != 19 && event.keyCode != 112 && event.keyCode != 113 && event.keyCode != 114 && event.keyCode != 115 && event.keyCode != 116 && event.keyCode != 117 && event.keyCode != 118 && event.keyCode != 119 && event.keyCode != 120 && event.keyCode != 121 && event.keyCode != 122 && event.keyCode != 123) {
                        avaibleStrs = [];
                        hInstance.replaceRange(
                            '"text/css"', {
                                line: hInstance.getCursor().line, ch:token.start
                            },
                            {
                                line:hInstance.getCursor().line , ch:token.end
                            }
                        );
                    }
                    
                    avaibleStrs = filter(avaibleStrs, tokenString, true);

                    let arrayTypes = [];
                    for(i = 0; i < avaibleStrs.length; i++) {
                        arrayTypes[i] = "string";
                    }

                    currentTokenType = "string";

                    displayAutocomplete(avaibleStrs, arrayTypes);
                } else if(attributeName == "accept") {
                    let token = hInstance.getTokenAt(hInstance.getCursor());
                    let tokenString  = token.string.slice(1, token.string.length - 1);
                    
                    let contentBeforeCursor = hInstance.getValue().substring(0, hInstance.indexFromPos(hInstance.getCursor()));
                    let contentAfterCursor = hInstance.getValue().slice(hInstance.indexFromPos(hInstance.getCursor()), hInstance.getValue().length);
                    
                    if(contentBeforeCursor.lastIndexOf(",") != -1 && contentAfterCursor.search(",") != -1) {
                        tokenString = hInstance.getValue().slice(contentBeforeCursor.lastIndexOf(",") + 1, contentAfterCursor.search(",") + hInstance.indexFromPos(hInstance.getCursor()));
                    } else if(contentBeforeCursor.lastIndexOf(",") != -1 && contentAfterCursor.search(",") == -1) {
                        tokenString = hInstance.getValue().slice(contentBeforeCursor.lastIndexOf(",") + 1, token.end - 1);
                    } else if(contentBeforeCursor.lastIndexOf(",") == -1 && contentAfterCursor.search(",") != -1) {
                        tokenString = hInstance.getValue().slice(token.start + 1, contentAfterCursor.search(",") + hInstance.indexFromPos(hInstance.getCursor()));
                    } else {
                        tokenString = tokenString;
                    }
                    
                    if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "input" && hasAttributeWithValue(hInstance.getValue(), hInstance.getCursor(), "type", "file")) {
                        avaibleStrs.length = 0;
                        appendArrayToAnother(avaibleStrs, fileExtensions);
                        appendArrayToAnother(avaibleStrs, FileSystem.readFileSync("HTMLMime.dat").toString().split("\n"));
                    }

                    avaibleStrs = filter(avaibleStrs, tokenString, true);

                    let arrayTypes = [];
                    for(i = 0; i < avaibleStrs.length; i++) {
                        arrayTypes[i] = "string";
                    }

                    currentTokenType = "mime";

                    displayAutocomplete(avaibleStrs, arrayTypes);
                } else if(attributeName == "accept-charset") {
                    let token = hInstance.getTokenAt(hInstance.getCursor());
                    let tokenString  = token.string.slice(1, token.string.length - 1);
                    
                    if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "form") {
                        avaibleStrs.length = 0;
                        appendArrayToAnother(avaibleStrs, ["ASCII", "ANSI", "WIN-1252", "ISO-8859-1", "ISO-8859", "UTF-16", "UTF-8"]);
                    }

                    avaibleStrs = filter(avaibleStrs, tokenString, true);

                    let arrayTypes = [];
                    for(i = 0; i < avaibleStrs.length; i++) {
                        arrayTypes[i] = "string";
                    }

                    currentTokenType = "string";

                    displayAutocomplete(avaibleStrs, arrayTypes);
                } else if(attributeName == "accesskey") {
                    let token = hInstance.getTokenAt(hInstance.getCursor());
                    let tokenString  = token.string.slice(1, token.string.length - 1);
                    
                    avaibleStrs.length = 0;
                    appendArrayToAnother(avaibleStrs, keyboardKeys);

                    avaibleStrs = filter(avaibleStrs, tokenString, true);
                    
                    let arrayTypes = [];
                    for(i = 0; i < avaibleStrs.length; i++) {
                        arrayTypes[i] = "string";
                    }

                    currentTokenType = "string";

                    displayAutocomplete(avaibleStrs, arrayTypes);
                } else if(attributeName == "autocomplete") {
                    let token = hInstance.getTokenAt(hInstance.getCursor());
                    let tokenString  = token.string.slice(1, token.string.length - 1);
                    
                    avaibleStrs.length = 0;
                    if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "input" || extractTagName(hInstance.getValue(), hInstance.getCursor()) == "form") {
                       appendArrayToAnother(avaibleStrs, ["on", "off", "true", "false"]);
                    }

                    avaibleStrs = filter(avaibleStrs, tokenString, true);
                    
                    let arrayTypes = [];
                    for(i = 0; i < avaibleStrs.length; i++) {
                        arrayTypes[i] = "boolean";
                    }

                    currentTokenType = "string";

                    displayAutocomplete(avaibleStrs, arrayTypes);
                } else if(attributeName == "charset") {
                    let token = hInstance.getTokenAt(hInstance.getCursor());
                    let tokenString  = token.string.slice(1, token.string.length - 1);
                    
                    if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "meta" || extractTagName(hInstance.getValue(), hInstance.getCursor()) == "script") {
                        avaibleStrs.length = 0;
                        appendArrayToAnother(avaibleStrs, ["ASCII", "ANSI", "WIN-1252", "ISO-8859-1", "ISO-8859", "UTF-16", "UTF-8"]);
                    }

                    avaibleStrs = filter(avaibleStrs, tokenString, true);

                    let arrayTypes = [];
                    for(i = 0; i < avaibleStrs.length; i++) {
                        arrayTypes[i] = "string";
                    }

                    currentTokenType = "string";

                    displayAutocomplete(avaibleStrs, arrayTypes);
                } else if(attributeName == "class") {
                    let token = hInstance.getTokenAt(hInstance.getCursor());
                    let tokenString  = token.string.slice(1, token.string.length - 1);
                    
                    avaibleStrs = gatherAllLinkedStylesheets(hInstance.getValue(), hInstance.getCursor());

                    avaibleStrs = filter(avaibleStrs, tokenString, true);

                    let arrayTypes = [];
                    for(i = 0; i < avaibleStrs.length; i++) {
                        arrayTypes[i] = "string";
                    }

                    currentTokenType = "string";

                    displayAutocomplete(avaibleStrs, arrayTypes);
                } else if(attributeName == "contenteditable" || attributeName == "draggable") {
                    let token = hInstance.getTokenAt(hInstance.getCursor());
                    let tokenString  = token.string.slice(1, token.string.length - 1);
                    
                    avaibleStrs.length = 0;
                    appendArrayToAnother(avaibleStrs, ["on", "off", "true", "false"]);

                    avaibleStrs = filter(avaibleStrs, tokenString, true);
                    
                    let arrayTypes = [];
                    for(i = 0; i < avaibleStrs.length; i++) {
                        arrayTypes[i] = "boolean";
                    }

                    currentTokenType = "string";

                    displayAutocomplete(avaibleStrs, arrayTypes);
                } else if(attributeName == "dir") {
                    let token = hInstance.getTokenAt(hInstance.getCursor());
                    let tokenString  = token.string.slice(1, token.string.length - 1);
                    
                    avaibleStrs.length = 0;
                    appendArrayToAnother(avaibleStrs, ["rtl", "ltr"]);

                    avaibleStrs = filter(avaibleStrs, tokenString, true);

                    let arrayTypes = [];
                    for(i = 0; i < avaibleStrs.length; i++) {
                        arrayTypes[i] = "string";
                    }

                    currentTokenType = "string";

                    displayAutocomplete(avaibleStrs, arrayTypes);
                } else if(attributeName == "dirname") {
                    let token = hInstance.getTokenAt(hInstance.getCursor());
                    let tokenString  = token.string.slice(1, token.string.length - 1);
                    
                    if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "input" && event.keyCode != 16 && event.keyCode != 38 && event.keyCode != 40 && event.keyCode != 39 && event.keyCode != 37 && event.keyCode != 17 && event.keyCode != 144 && event.keyCode != 93 && event.keyCode != 20 && event.keyCode != 27 && event.keyCode != 112 && event.keyCode != 45 && event.keyCode != 19 && event.keyCode != 112 && event.keyCode != 113 && event.keyCode != 114 && event.keyCode != 115 && event.keyCode != 116 && event.keyCode != 117 && event.keyCode != 118 && event.keyCode != 119 && event.keyCode != 120 && event.keyCode != 121 && event.keyCode != 122 && event.keyCode != 123 && extractNameAttribute(hInstance.getValue(), hInstance.getCursor()) != "empty" || extractTagName(hInstance.getValue(), hInstance.getCursor()) == "textarea" && event.keyCode != 16 && event.keyCode != 38 && event.keyCode != 40 && event.keyCode != 39 && event.keyCode != 37 && event.keyCode != 17 && event.keyCode != 144 && event.keyCode != 93 && event.keyCode != 20 && event.keyCode != 27 && event.keyCode != 112 && event.keyCode != 45 && event.keyCode != 19 && event.keyCode != 112 && event.keyCode != 113 && event.keyCode != 114 && event.keyCode != 115 && event.keyCode != 116 && event.keyCode != 117 && event.keyCode != 118 && event.keyCode != 119 && event.keyCode != 120 && event.keyCode != 121 && event.keyCode != 122 && event.keyCode != 123 && extractNameAttribute(hInstance.getValue(), hInstance.getCursor()) != "empty") {
                        avaibleStrs = [];
                        let extractedName = extractNameAttribute(hInstance.getValue(), hInstance.getCursor());
                        hInstance.replaceRange(
                            '"' + extractedName.split('"').join("").split("'").join("") + ".dir" + '"', {
                                line: hInstance.getCursor().line, ch:token.start
                            },
                            {
                                line:hInstance.getCursor().line , ch:token.end
                            }
                        );
                    }
                } else if(attributeName == "dropzone") {
                    let token = hInstance.getTokenAt(hInstance.getCursor());
                    let tokenString  = token.string.slice(1, token.string.length - 1);
                    
                    avaibleStrs.length = 0;
                    appendArrayToAnother(avaibleStrs, ["copy", "move", "link"]);

                    avaibleStrs = filter(avaibleStrs, tokenString, true);

                    let arrayTypes = [];
                    for(i = 0; i < avaibleStrs.length; i++) {
                        arrayTypes[i] = "string";
                    }

                    currentTokenType = "string";

                    displayAutocomplete(avaibleStrs, arrayTypes);
                } else if(attributeName == "enctype") {
                    let token = hInstance.getTokenAt(hInstance.getCursor());
                    let tokenString  = token.string.slice(1, token.string.length - 1);
                    
                    if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "form" && hasAttributeWithValue(hInstance.getValue(), hInstance.getCursor(), "method", "post")) {
                        avaibleStrs.length = 0;
                        appendArrayToAnother(avaibleStrs, FileSystem.readFileSync("HTMLMime.dat").toString().split("\n"));
                    }

                    avaibleStrs = filter(avaibleStrs, tokenString, true);

                    let arrayTypes = [];
                    for(i = 0; i < avaibleStrs.length; i++) {
                        arrayTypes[i] = "string";
                    }

                    currentTokenType = "mime";

                    displayAutocomplete(avaibleStrs, arrayTypes);
                } else if(attributeName == "for") {
                    let token = hInstance.getTokenAt(hInstance.getCursor());
                    let tokenString  = token.string.slice(1, token.string.length - 1);
                    
                    if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "label" || extractTagName(hInstance.getValue(), hInstance.getCursor()) == "output") {
                        avaibleStrs.length = 0;
                        let allIDs = gatherAllIDs(hInstance.getValue());
                        for(i = 0; i < allIDs.length; i++) {
                            allIDs[i] = allIDs[i].replace(/^#/, "");
                        }
                        appendArrayToAnother(avaibleStrs, allIDs);
                    }

                    avaibleStrs = filter(avaibleStrs, tokenString, true);

                    let arrayTypes = [];
                    for(i = 0; i < avaibleStrs.length; i++) {
                        arrayTypes[i] = "section";
                    }

                    currentTokenType = "string";

                    displayAutocomplete(avaibleStrs, arrayTypes);
                } else if(attributeName == "form") {
                    let token = hInstance.getTokenAt(hInstance.getCursor());
                    let tokenString  = token.string.slice(1, token.string.length - 1);
                    
                    if(extractTagName(hInstance.getValue(), hInstance.getCursor() == "button") || extractTagName(hInstance.getValue(), hInstance.getCursor() == "fieldset") || extractTagName(hInstance.getValue(), hInstance.getCursor() == "input") || extractTagName(hInstance.getValue(), hInstance.getCursor() == "label") || extractTagName(hInstance.getValue(), hInstance.getCursor() == "meter") || extractTagName(hInstance.getValue(), hInstance.getCursor() == "object") || extractTagName(hInstance.getValue(), hInstance.getCursor() == "output") || extractTagName(hInstance.getValue(), hInstance.getCursor() == "select") || extractTagName(hInstance.getValue(), hInstance.getCursor() == "textarea")) {
                        avaibleStrs.length = 0;
                        let allNames = gatherAllFormNames(hInstance.getValue());
                        appendArrayToAnother(avaibleStrs, allNames);
                    }

                    avaibleStrs = filter(avaibleStrs, tokenString, true);

                    let arrayTypes = [];
                    for(i = 0; i < avaibleStrs.length; i++) {
                        arrayTypes[i] = "string";
                    }

                    currentTokenType = "string";

                    displayAutocomplete(avaibleStrs, arrayTypes);
                } else if(attributeName == "headers") {
                    let token = hInstance.getTokenAt(hInstance.getCursor());
                    let tokenString  = token.string.slice(1, token.string.length - 1);
                    
                    if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "td" || extractTagName(hInstance.getValue(), hInstance.getCursor()) == "th") {
                        avaibleStrs.length = 0;
                        let allIDs = gatherAllIDs(hInstance.getValue());
                        for(i = 0; i < allIDs.length; i++) {
                            allIDs[i] = allIDs[i].replace(/^#/, "");
                        }
                        appendArrayToAnother(avaibleStrs, allIDs);
                    }

                    avaibleStrs = filter(avaibleStrs, tokenString, true);

                    let arrayTypes = [];
                    for(i = 0; i < avaibleStrs.length; i++) {
                        arrayTypes[i] = "section";
                    }

                    currentTokenType = "string";

                    displayAutocomplete(avaibleStrs, arrayTypes);
                } else if(attributeName == "hreflang") {
                    let token = hInstance.getTokenAt(hInstance.getCursor());
                    let tokenString  = token.string.slice(1, token.string.length - 1);
                    
                    if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "a" || extractTagName(hInstance.getValue(), hInstance.getCursor()) == "area" || extractTagName(hInstance.getValue(), hInstance.getCursor()) == "link") {
                        avaibleStrs.length = 0;
                        avaibleStrs = langs;
                    }

                    avaibleStrs = filter(avaibleStrs, tokenString, true);

                    let arrayTypes = [];
                    for(i = 0; i < avaibleStrs.length; i++) {
                        arrayTypes[i] = "string";
                    }

                    currentTokenType = "string";

                    displayAutocomplete(avaibleStrs, arrayTypes);
                } else if(attributeName == "http-equiv") {
                    let token = hInstance.getTokenAt(hInstance.getCursor());
                    let tokenString  = token.string.slice(1, token.string.length - 1);
                    
                    if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "meta") {
                        avaibleStrs.length = 0;
                        avaibleStrs = ["content-security-policy", "content-type", "default-title", "x-ua-compatible", "refresh"];
                    }

                    avaibleStrs = filter(avaibleStrs, tokenString, true);

                    let arrayTypes = [];
                    for(i = 0; i < avaibleStrs.length; i++) {
                        arrayTypes[i] = "string";
                    }

                    currentTokenType = "string";

                    displayAutocomplete(avaibleStrs, arrayTypes);
                } else if(attributeName == "content") {
                    let token = hInstance.getTokenAt(hInstance.getCursor());
                    let tokenString  = token.string.slice(1, token.string.length - 1);
                    
                    if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "meta" && hasAttributeWithValue(hInstance.getValue(), hInstance.getCursor(), "http-equiv", "content-type") && event.keyCode != 16 && event.keyCode != 38 && event.keyCode != 40 && event.keyCode != 39 && event.keyCode != 37 && event.keyCode != 17 && event.keyCode != 144 && event.keyCode != 93 && event.keyCode != 20 && event.keyCode != 27 && event.keyCode != 112 && event.keyCode != 45 && event.keyCode != 19 && event.keyCode != 112 && event.keyCode != 113 && event.keyCode != 114 && event.keyCode != 115 && event.keyCode != 116 && event.keyCode != 117 && event.keyCode != 118 && event.keyCode != 119 && event.keyCode != 120 && event.keyCode != 121 && event.keyCode != 122) {
                        avaibleStrs = [];
                        hInstance.replaceRange(
                            '"text/html; charset=utf-8"', {
                                line: hInstance.getCursor().line, ch:token.start
                            },
                            {
                                line:hInstance.getCursor().line , ch:token.end
                            }
                        );
                    }
                } else if(attributeName == "kind") {
                    let token = hInstance.getTokenAt(hInstance.getCursor());
                    let tokenString  = token.string.slice(1, token.string.length - 1);
                    
                    if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "track") {
                        avaibleStrs.length = 0;
                        avaibleStrs = ["subtitles", "captions", "descriptions", "chapters", "metadata"];
                    }

                    avaibleStrs = filter(avaibleStrs, tokenString, true);

                    let arrayTypes = [];
                    for(i = 0; i < avaibleStrs.length; i++) {
                        arrayTypes[i] = "string";
                    }

                    currentTokenType = "string";

                    displayAutocomplete(avaibleStrs, arrayTypes);
                } else if(attributeName == "lang") {
                    let token = hInstance.getTokenAt(hInstance.getCursor());
                    let tokenString  = token.string.slice(1, token.string.length - 1);
                    
                    avaibleStrs.length = 0;
                    avaibleStrs = langs;

                    avaibleStrs = filter(avaibleStrs, tokenString, true);

                    let arrayTypes = [];
                    for(i = 0; i < avaibleStrs.length; i++) {
                        arrayTypes[i] = "string";
                    }

                    currentTokenType = "string";

                    displayAutocomplete(avaibleStrs, arrayTypes);
                } else if(attributeName == "list") {
                    let token = hInstance.getTokenAt(hInstance.getCursor());
                    let tokenString  = token.string.slice(1, token.string.length - 1);
                    
                    if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "input") {
                        avaibleStrs.length = 0;
                        avaibleStrs = gatherAllDatalistIDs(hInstance.getValue());
                    }

                    avaibleStrs = filter(avaibleStrs, tokenString, true);

                    let arrayTypes = [];
                    for(i = 0; i < avaibleStrs.length; i++) {
                        arrayTypes[i] = "string";
                    }

                    currentTokenType = "string";

                    displayAutocomplete(avaibleStrs, arrayTypes);
                } else if(attributeName == "method") {
                    let token = hInstance.getTokenAt(hInstance.getCursor());
                    let tokenString  = token.string.slice(1, token.string.length - 1);
                    
                    if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "form") {
                        avaibleStrs.length = 0;
                        avaibleStrs = ["get", "post"];
                    }

                    avaibleStrs = filter(avaibleStrs, tokenString, true);

                    let arrayTypes = [];
                    for(i = 0; i < avaibleStrs.length; i++) {
                        arrayTypes[i] = "string";
                    }

                    currentTokenType = "string";

                    displayAutocomplete(avaibleStrs, arrayTypes);
                }
            } if(avaibleStrs[0] == "") {
                $("#_list").css("display", "none");
            }
            
            if(hInstance.getTokenTypeAt(hInstance.getCursor()) == "error" && hInstance.getTokenAt(hInstance.getCursor()).string.charAt(0) == "&" || hInstance.getTokenTypeAt(hInstance.getCursor()) == "atom") {
                let token = hInstance.getTokenAt(hInstance.getCursor());
                avaibleAtms = filter(htmlAscii, token.string, true);
                
                let arrayTypes = [];
                for(i = 0; i < avaibleAtms.length; i++) {
                    arrayTypes[i] = "atom";
                }
                
                currentTokenType = "atom";
                displayAutocomplete(avaibleAtms, arrayTypes);
            } if(avaibleAtms[0] == "") {
                $("#_list").css("display", "none");
            }

            if($("#_list").html() == "") {
                document.getElementById("_list").style.display = "none";
            }
            
            if(hInstance.getTokenAt(hInstance.getCursor()).type == "tag bracket") {
                $("#_list").css("display", "none");
            }
            
            if(hInstance.getTokenAt(hInstance.getCursor()).type == null) {
                $("#_list").css("display", "none");
            }
        }
        
        if(hInstance.getModeAt(hInstance.getCursor()).name == "javascript") {
            let avaibleJSKeywords = [];
            
            content = hInstance.getValue();
                
            let cursorPosition = hInstance.getCursor();
            let overallIndex = 0;
            
            for(i = 0; i < cursorPosition.line; i++) {
                overallIndex = overallIndex + hInstance.getLine(i).length + 1;
            }
            
            overallIndex = overallIndex + cursorPosition.ch;
            
            let contentBeforeCursor = content.substring(0, overallIndex);
            
            let lastScriptTagIndexRegEx = new RegExp("<\s*script.*>", "ig");
            let firstClosedScriptTagIndexRegEx = new RegExp("<\s*/\s*script\s*>", "ig");
            
            lastScriptTagIndexRegEx.test(contentBeforeCursor);
            let firstClosedScriptTagIndex = content.search(firstClosedScriptTagIndexRegEx);
            
            let lastScriptTagIndex = lastScriptTagIndexRegEx.lastIndex;
            
            let startAndEndOfScript = {
                from: 0,
                to: 0
            };
            
            if(hInstance.getTokenAt(hInstance.posFromIndex(lastScriptTagIndex)).type == "tag bracket" && hInstance.getTokenAt(hInstance.posFromIndex(firstClosedScriptTagIndex + 1)).type == "tag bracket") {
                lastScriptTagIndex = lastScriptTagIndex;
                startAndEndOfScript["from"] = lastScriptTagIndex;
                startAndEndOfScript["to"]   = firstClosedScriptTagIndex;
            }
            
            let sendedContent = content.slice(startAndEndOfScript["from"], startAndEndOfScript["to"]);
            
            FileSystem.writeFile("temp1.js", sendedContent, function(err) {
                if(err) {
                    alert("error");
                }
            });
            
            spawn('cmd.exe', ['/c', 'parse.bat']);
            
            if(hInstance.getTokenAt(hInstance.getCursor()).type == "def") {
                $("#_list").css("display", "none");
            } if(hInstance.getTokenAt(hInstance.getCursor()).type == "variable") {
                jsKeywords.splice(jsKeywords.indexOf(" "), jsKeywords.length - jsKeywords.indexOf(" "));
                
                additionnalVariablesAndFunctions = [];
                
                let f = FileSystem.readFileSync("parserOutput.js").toString();
                additionnalVariablesAndFunctions = f.split(", ");
                
                jsKeywords.push(" ");
                
                for(i = 0; i < additionnalVariablesAndFunctions.length; i++) {
                    jsKeywords.push(additionnalVariablesAndFunctions[i]);
                }
                
                var excluded = [];
                
                for(i = 0; i < jsKeywords.length; i++) {
                    let numberOfCharactersFound = 0;
                    
                    if(jsKeywords[i] == hInstance.getTokenAt(hInstance.getCursor()).string) {
                        avaibleJSKeywords.splice(0, 0, jsKeywords[i]);
                        excluded.push(jsKeywords[i]);
                    }
                    
                    for(j = 0; j < hInstance.getTokenAt(hInstance.getCursor()).string.length; j++) {
                        if(jsKeywords[i].search(hInstance.getTokenAt(hInstance.getCursor()).string.charAt(j)) != -1) {
                            numberOfCharactersFound = numberOfCharactersFound + 1;
                        }
                    }
                    
                    if(numberOfCharactersFound == hInstance.getTokenAt(hInstance.getCursor()).string.length) {
                        var bFound = false;
                        for(j = 0; j < excluded.length; j++) {
                            if(excluded[j] == jsKeywords[i]) {
                                bFound = true;
                            }
                        }
                        
                        if(bFound == false) {
                            avaibleJSKeywords.push(jsKeywords[i]);
                        }
                    }
                }
                
                console.log(excluded[0]);

                let xPos = document.getElementsByClassName('CodeMirror-cursor')[0].style.left;
                let x = xPos.replace("px", "");
                x = parseFloat(x);
                x = x + 80;
                x = x + "px";

                let yPos = document.getElementsByClassName('CodeMirror-cursor')[0].style.top;
                let y = yPos.replace("px", "");
                y = parseInt(y);
                y = y + 30;
                y = y + "px";

                $("#_list").css({
                    "display": "block",
                    "left"   : x,
                    "top"    : y
                });

                $("#_list").empty();

                let top = 0;
                let ID  = 0;

                for(i = 0; i < avaibleJSKeywords.length; i++) {
                    if(i == 0) {
                        $("#_list").append("<div class='list-item-top' id='" + ID + "'><i class='fas fa-code' style='width: 40px; height: 28px; line-height: 28px; position: absolute; top: 0; left: 0; text-align: center; color: #ffffff; background-color: #ba00ff;'></i>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" + avaibleJSKeywords[i] + "</span>" + "<br>");
                    } else {
                        $("#_list").append("<div class='list-item'  id='" + ID + "'><i class='fas fa-code' style='width: 40px; height: 28px; line-height: 28px; position: absolute; top: " + top + "px; left: 0; text-align: center; color: #ffffff; background-color: #ba00ff;'></i>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" + avaibleJSKeywords[i] + "</span>" + "<br>");
                    }

                    top = top + 28;
                    ID = ID + 1;
                }
            } if(hInstance.getTokenAt(hInstance.getCursor()).type == "property") {
                
                contentBeforeCursor = contentBeforeCursor.split(" ").join("");
                contentBeforeCursor = contentBeforeCursor.split("\n").join("");
                
                let lastIndexOfEND = contentBeforeCursor.lastIndexOf(";");
                
                let removePropertyRegEx = new RegExp(/\..*/g);
                
                contentBeforeCursor = contentBeforeCursor.slice(lastIndexOfEND + 1, contentBeforeCursor.length);
                
                let mode = hInstance.getModeAt(cursorPosition);
                contentBeforeCursor = contentBeforeCursor.replace(removePropertyRegEx, "");
                
                console.log(contentBeforeCursor);
                
                console.log(mode);
                
                var excluded = [];
                
                for(i = 0; i < jsKeywords.length; i++) {
                    let numberOfCharactersFound = 0;
                    
                    if(jsKeywords[i] == hInstance.getTokenAt(hInstance.getCursor()).string) {
                        avaibleJSKeywords.splice(0, 0, jsKeywords[i]);
                        excluded.push(jsKeywords[i]);
                    }
                    
                    for(j = 0; j < hInstance.getTokenAt(hInstance.getCursor()).string.length; j++) {
                        if(jsKeywords[i].search(hInstance.getTokenAt(hInstance.getCursor()).string.charAt(j)) != -1) {
                            numberOfCharactersFound = numberOfCharactersFound + 1;
                        }
                    }
                    
                    if(numberOfCharactersFound == hInstance.getTokenAt(hInstance.getCursor()).string.length) {
                        var bFound = false;
                        for(j = 0; j < excluded.length; j++) {
                            if(excluded[j] == jsKeywords[i]) {
                                bFound = true;
                            }
                        }
                        
                        if(bFound == false) {
                            avaibleJSKeywords.push(jsKeywords[i]);
                        }
                    }
                }
                
                console.log(excluded[0]);

                let xPos = document.getElementsByClassName('CodeMirror-cursor')[0].style.left;
                let x = xPos.replace("px", "");
                x = parseFloat(x);
                x = x + 80;
                x = x + "px";

                let yPos = document.getElementsByClassName('CodeMirror-cursor')[0].style.top;
                let y = yPos.replace("px", "");
                y = parseInt(y);
                y = y + 30;
                y = y + "px";

                $("#_list").css({
                    "display": "block",
                    "left"   : x,
                    "top"    : y
                });

                $("#_list").empty();

                let top = 0;
                let ID  = 0;

                for(i = 0; i < avaibleJSKeywords.length; i++) {
                    if(i == 0) {
                        $("#_list").append("<div class='list-item-top' id='" + ID + "'><i class='fas fa-code' style='width: 40px; height: 28px; line-height: 28px; position: absolute; top: 0; left: 0; text-align: center; color: #ffffff; background-color: #ba00ff;'></i>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" + avaibleJSKeywords[i] + "</span>" + "<br>");
                    } else {
                        $("#_list").append("<div class='list-item'  id='" + ID + "'><i class='fas fa-code' style='width: 40px; height: 28px; line-height: 28px; position: absolute; top: " + top + "px; left: 0; text-align: center; color: #ffffff; background-color: #ba00ff;'></i>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" + avaibleJSKeywords[i] + "</span>" + "<br>");
                    }

                    top = top + 28;
                    ID = ID + 1;
                }
            } if(avaibleJSKeywords[0] == "") {
                $("#_list").css("display", "none");
            }

            if($("#_list").html() == "") {
                document.getElementById("_list").style.display = "none";
            }
            
            if(hInstance.getTokenAt(hInstance.getCursor()).type == "tag bracket") {
                $("#_list").css("display", "none");
            }
            
            if(hInstance.getTokenAt(hInstance.getCursor()).type == null) {
                $("#_list").css("display", "none");
            }
        }
    });
    
    document.onclick = function(event) {
        let clickedElement = event.target;
        if(bContextMenu) {
            $("#_contextmenu").css("display", "none");
            bContextMenu = false;
        }
        
        if(clickedElement.className == "span" || clickedElement.className == "item") {
            let nodeList = document.getElementsByClassName("item");
            for(i = 0; i < nodeList.length; i++) {
                nodeList[i].style.backgroundColor = "transparent";
            }
            
            if(clickedElement.className == "span") {
                clickedElement.parentNode.style.backgroundColor = "#ddd";
            } else if(clickedElement.className == "item") {
                clickedElement.style.backgroundColor = "#ddd";
            }
        } else {
            $("#_list").css("display", "none");
            hInstance.focus();
        }
    };
    
    document.ondblclick = function(event) {
        let clickedElement = event.target;
        if(clickedElement.className == "span" || clickedElement.className == "item") {
            if(currentTokenType == "path") {
                let token = hInstance.getTokenAt(hInstance.getCursor());
                if(token.string.search(/\\/g) != -1 || token.string.search("/") != -1) {
                    token.string = token.string.split("\\").join("/");  //Backslash support for Linux.
                    let lastSlashIndex = token.string.lastIndexOf("/");
                    let replacedString = token.string.substring(0, lastSlashIndex);
                    let start = lastSlashIndex + 1;
                    let end   = token.string.length;
                    
                    hInstance.replaceRange(
                        clickedElement.innerText + '"', {
                            line: hInstance.getCursor().line, ch:start + token.start
                        },
                        {
                            line:hInstance.getCursor().line , ch:token.end + token.start
                        }
                    );
                    
                    $("#_list").css("display", "none");
                    hInstance.focus();
                } else {
                    hInstance.replaceRange(
                        '"' + clickedElement.innerText + '"', {
                            line: hInstance.getCursor().line, ch:token.start
                        },
                        {
                            line:hInstance.getCursor().line , ch:token.end
                        }
                    );
                    
                    $("#_list").css("display", "none");
                    hInstance.focus();
                }
            } else if(currentTokenType == "atom") {
                let token = hInstance.getTokenAt(hInstance.getCursor());
                                
                $("#_list").css("display", "none");
                hInstance.focus();
                
                let text = clickedElement.innerText.substring(0, clickedElement.innerText.search(";") + 1);
                
                hInstance.replaceRange(
                    text, {
                        line: hInstance.getCursor().line, ch:token.start
                    },
                    {
                        line:hInstance.getCursor().line , ch:token.end
                    }
                );
                
            } else if(currentTokenType == "string") {
                let token = hInstance.getTokenAt(hInstance.getCursor());
                $("#_list").css("display", "none");
                hInstance.focus();
                
                let text = '"' + clickedElement.innerText + '"';
                
                hInstance.replaceRange(
                    text, {
                        line: hInstance.getCursor().line, ch:token.start
                    },
                    {
                        line:hInstance.getCursor().line , ch:token.end
                    }
                );
            } else if(currentTokenType == "mime") {
                let token = hInstance.getTokenAt(hInstance.getCursor());
                let tokenString  = token.string.slice(1, token.string.length - 1);
                $("#_list").css("display", "none");
                hInstance.focus();
                
                let contentBeforeCursor = hInstance.getValue().substring(0, hInstance.indexFromPos(hInstance.getCursor()));
                let contentAfterCursor = hInstance.getValue().slice(hInstance.indexFromPos(hInstance.getCursor()), hInstance.getValue().length);
                
                if(contentBeforeCursor.lastIndexOf(",") != -1 && contentAfterCursor.search(",") != -1) {
                    tokenString = hInstance.getValue().slice(contentBeforeCursor.lastIndexOf(",") + 1, contentAfterCursor.search(",") + hInstance.indexFromPos(hInstance.getCursor()));
                    
                    hInstance.replaceRange(
                        clickedElement.innerText, {
                            line: hInstance.posFromIndex(contentBeforeCursor.lastIndexOf(",") + 1).line, ch: hInstance.posFromIndex(contentBeforeCursor.lastIndexOf(",") + 1).ch
                        },
                        {
                            line: hInstance.posFromIndex(contentAfterCursor.search(",") + hInstance.indexFromPos(hInstance.getCursor())).line, ch: hInstance.posFromIndex(contentAfterCursor.search(",") + hInstance.indexFromPos(hInstance.getCursor())).ch
                        }
                    );
                } else if(contentBeforeCursor.lastIndexOf(",") != -1 && contentAfterCursor.search(",") == -1) {
                    tokenString = hInstance.getValue().slice(contentBeforeCursor.lastIndexOf(",") + 1, token.end - 1);
                    hInstance.replaceRange(
                        clickedElement.innerText, {
                            line: hInstance.posFromIndex(contentBeforeCursor.lastIndexOf(",") + 1).line, ch: hInstance.posFromIndex(contentBeforeCursor.lastIndexOf(",") + 1).ch
                        },
                        {
                            line: hInstance.posFromIndex(token.end - 1).line, ch: hInstance.posFromIndex(token.end - 1).ch
                        }
                    );
                } else if(contentBeforeCursor.lastIndexOf(",") == -1 && contentAfterCursor.search(",") != -1) {
                    tokenString = hInstance.getValue().slice(token.start + 1, contentAfterCursor.search(",") + hInstance.indexFromPos(hInstance.getCursor()));
                    hInstance.replaceRange(
                        clickedElement.innerText, {
                            line: hInstance.posFromIndex(token.start + 1).line, ch: hInstance.posFromIndex(token.start + 1).ch
                        },
                        {
                            line: hInstance.posFromIndex(contentAfterCursor.search(",") + hInstance.indexFromPos(hInstance.getCursor())).line, ch: hInstance.posFromIndex(contentAfterCursor.search(",") + hInstance.indexFromPos(hInstance.getCursor())).ch
                        }
                    );
                } else {
                    tokenString = tokenString
                    hInstance.replaceRange(
                        '"' + clickedElement.innerText + '"', {
                            line: hInstance.posFromIndex(token.start).line, ch: hInstance.posFromIndex(token.start).ch
                        },
                        {
                            line: hInstance.posFromIndex(token.end).line, ch: hInstance.posFromIndex(token.end).ch
                        }
                    );
                }
            } else {
                let token = hInstance.getTokenAt(hInstance.getCursor());
                hInstance.replaceRange(
                    clickedElement.innerText, {
                        line: hInstance.getCursor().line, ch:token.start
                    },
                    {
                        line:hInstance.getCursor().line , ch:token.end
                    }
                );
                
                $("#_list").css("display", "none");
                hInstance.focus();
            }
        } else {
            $("#_list").css("display", "none");
            hInstance.focus();
        }
    };
});
