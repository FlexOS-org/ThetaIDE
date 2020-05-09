const FileSystem = require('fs');
const { spawn }  = require('child_process');

var id;
var hInstance;

var MAX_TAGS = [];

let CONTENT = "";
let closeTag = true;

let currentTokenType = "";

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

    $("#_list").css({
        "display": "inline-block",
        "left"   : x,
        "top"    : y
    });

    $("#_list").empty();
    
    if(currentTokenType == "atom") {
        for(i = 0; i < arrayElements.length; i++) {
            $("#_list").append('<div class="item" id="_' + i + '"><span class="span">' + arrayElements[i].split("&").join("&amp;").split("#").join("&#35;") + '<span class="span" style="position: absolute; left: 430px;">' + arrayElements[i] + '</span></span><i class="' + arrayTypes[i] + '"></i></div>');
        }
    } else {
        for(i = 0; i < arrayElements.length; i++) {
            $("#_list").append('<div class="item" id="_' + i + '"><span class="span">' + arrayElements[i] + '</span><i class="' + arrayTypes[i] + '"></i></div>');
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
    
    return attName;
}

function extractMediaTypeFromLink(content, cursor) {
    let cursorIndex        = hInstance.indexFromPos(cursor);
    let mediaType          = "";
    
    for(d = cursorIndex; d > 0; d--) {
        if(hInstance.getTokenTypeAt(hInstance.posFromIndex(d)) == "attribute" && hInstance.getTokenAt(hInstance.posFromIndex(d)).string == "rel") {
            let string = hInstance.getTokenAt(hInstance.posFromIndex(hInstance.getTokenAt(hInstance.posFromIndex(d)).end + 2)).string;
            return string;
            break;
        }
    }
}

function hasTypeImageAttribute(content, cursor) {
    let cursorIndex        = hInstance.indexFromPos(cursor);
    let attName            = "";
    
    for(d = cursorIndex; d > 0; d--) {
        if(hInstance.getTokenAt(hInstance.posFromIndex(d)).type == "attribute" && hInstance.getTokenAt(hInstance.posFromIndex(d)).string == "type") {
            if(hInstance.getTokenAt(hInstance.posFromIndex(hInstance.getTokenAt(hInstance.posFromIndex(d)).end + 2)).string == '"image"') {
                return true;
                break;
            }
        }
    }
}

function gatherAllIDs(content) {
    /*let tokens = [];
    let extendedTokens = [];
    
    for(i = 0; i < hInstance.lineCount(); i++) {
        extendedTokens.length = 0;
        extendedTokens = hInstance.getLineTokens(i);
        appendArrayToAnother(tokens, extendedTokens);
    }
    
    for(i = 0; i < tokens.length; i++) {
        if(tokens[i].type != "attribute" && tokens[i].string.toLowerCase() != "id") {
            tokens.splice(i, 1);
        }
    }
    
    let returnedIDs = [];
    for(i = 0; i < tokens.length; i++) {
        let foundTokenType = "";
        for(j = tokens[i].end; j < hInstance.getValue().length; j++) {
            if(hInstance.getTokenTypeAt(hInstance.posFromIndex(j)) == "string") {
                returnedIDs.push(hInstance.getTokenAt(hInstance.posFromIndex(j)).string.split('"').join(""));
                j = j + hInstance.getTokenAt(hInstance.posFromIndex(j)).string.length +  4;
            }
        }
    }
    
    return returnedIDs;*/
    
    let tokens = [];
    let extendedTokens = [];
    
    for(i = 0; i < hInstance.lineCount(); i++) {
        extendedTokens.length = 0;
        extendedTokens = hInstance.getLineTokens(i);
        appendArrayToAnother(tokens, extendedTokens);
    }
    
    for(i = 0; i < tokens.length; i++) {
        if(tokens[i].type != "string") {
            tokens.splice(i, 1);
        }
    }
}

$(document).ready(function() {
    for(i = 0; i < 500; i++) {
        MAX_TAGS.push(i);
    }
    
    $(".CodeMirror").height($(window).height());
    
    $(window).resize(function() {
        $(".CodeMirror").height($(window).height());
    });
    
    hInstance.on("keyup", function(editor, event) {
        alert(gatherAllIDs(hInstance.getValue()));
        
        console.log(hInstance.getTokenAt(hInstance.getCursor()));
        
        if(hInstance.getModeAt(hInstance.getCursor()).name != "xml" && hInstance.getModeAt(hInstance.getCursor()).name != "javascript" && hInstance.getModeAt(hInstance.getCursor()).name != "css") { $("#_list").css("display", "none"); }
        
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
                        } else if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "input" && hasTypeImageAttribute(hInstance.getValue(), hInstance.getCursor())) {
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
                        } else if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "input" && hasTypeImageAttribute(hInstance.getValue(), hInstance.getCursor())) {
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
                            if(extractMediaTypeFromLink(hInstance.getValue(), hInstance.getCursor()) == '"stylesheet"') {
                                for(i = 0; i < existingFiles.length; i++) {
                                    if(FileSystem.lstatSync(path + existingFiles[i]).isFile()) {
                                        if(existingFiles[i].endsWith(".css")) {
                                            filtredExistingFiles.push(existingFiles[i]);
                                        }
                                    } else {
                                        filtredExistingFiles.push(existingFiles[i]);
                                    }
                                }
                            } else if(extractMediaTypeFromLink(hInstance.getValue(), hInstance.getCursor()) == '"alternate"') {
                                for(i = 0; i < existingFiles.length; i++) {
                                    filtredExistingFiles.push(existingFiles[i]);
                                }
                            } else if(extractMediaTypeFromLink(hInstance.getValue(), hInstance.getCursor()) == '"author"') {
                                for(i = 0; i < existingFiles.length; i++) {
                                    filtredExistingFiles.push(existingFiles[i]);
                                }
                            } else if(extractMediaTypeFromLink(hInstance.getValue(), hInstance.getCursor()) == '"help"') {
                                for(i = 0; i < existingFiles.length; i++) {
                                    if(FileSystem.lstatSync(path + existingFiles[i]).isFile()) {
                                        if(existingFiles[i].endsWith(".html") || existingFiles[i].endsWith(".htm") || existingFiles[i].endsWith(".asp")) {
                                            filtredExistingFiles.push(existingFiles[i]);
                                        }
                                    } else {
                                        filtredExistingFiles.push(existingFiles[i]);
                                    }
                                }
                            } else if(extractMediaTypeFromLink(hInstance.getValue(), hInstance.getCursor()) == '"icon"') {
                                for(i = 0; i < existingFiles.length; i++) {
                                    if(FileSystem.lstatSync(path + existingFiles[i]).isFile()) {
                                        if(existingFiles[i].endsWith(".ico") || existingFiles[i].endsWith(".bmp") || existingFiles[i].endsWith(".png") || existingFiles[i].endsWith(".jpg")) {
                                            filtredExistingFiles.push(existingFiles[i]);
                                        }
                                    } else {
                                        filtredExistingFiles.push(existingFiles[i]);
                                    }
                                }
                            } else if(extractMediaTypeFromLink(hInstance.getValue(), hInstance.getCursor()) == '"license"') {
                                for(i = 0; i < existingFiles.length; i++) {
                                    filtredExistingFiles.push(existingFiles[i]);
                                }
                            } else if(extractMediaTypeFromLink(hInstance.getValue(), hInstance.getCursor()) == '"help"') {
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
                        } else if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == "a") {
                            for(i = 0; i < existingFiles.length; i++) {
                                filtredExistingFiles.push(existingFiles[i]);
                            }
                        }
                        
                        /*let sections = gatherAllIDs(hInstance.getValue());
                        
                        for(i = 0; i < sections.length; i++) {
                            filtredExistingFiles.push(sections[i]);
                        }*/
                        
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
                        if(extractTagName(hInstance.getValue(), hInstance.getCursor()) == 'link') {
                            if(extractMediaTypeFromLink(hInstance.getValue(), hInstance.getCursor()) == '"stylesheet"') {
                                for(i = 0; i < existingFiles.length; i++) {
                                    if(FileSystem.lstatSync(existingFiles[i]).isFile()) {
                                        if(existingFiles[i].endsWith(".css")) {
                                            filtredExistingFiles.push(existingFiles[i]);
                                        }
                                    } else {
                                        filtredExistingFiles.push(existingFiles[i]);
                                    }
                                }
                            } else if(extractMediaTypeFromLink(hInstance.getValue(), hInstance.getCursor()) == '"alternate"') {
                                for(i = 0; i < existingFiles.length; i++) {
                                    filtredExistingFiles.push(existingFiles[i]);
                                }
                            } else if(extractMediaTypeFromLink(hInstance.getValue(), hInstance.getCursor()) == '"author"') {
                                for(i = 0; i < existingFiles.length; i++) {
                                    filtredExistingFiles.push(existingFiles[i]);
                                }
                            } else if(extractMediaTypeFromLink(hInstance.getValue(), hInstance.getCursor()) == '"help"') {
                                for(i = 0; i < existingFiles.length; i++) {
                                    if(FileSystem.lstatSync(existingFiles[i]).isFile()) {
                                        if(existingFiles[i].endsWith(".html") || existingFiles[i].endsWith(".htm") || existingFiles[i].endsWith(".asp")) {
                                            filtredExistingFiles.push(existingFiles[i]);
                                        }
                                    } else {
                                        filtredExistingFiles.push(existingFiles[i]);
                                    }
                                }
                            } else if(extractMediaTypeFromLink(hInstance.getValue(), hInstance.getCursor()) == '"icon"') {
                                for(i = 0; i < existingFiles.length; i++) {
                                    if(FileSystem.lstatSync(existingFiles[i]).isFile()) {
                                        if(existingFiles[i].endsWith(".ico") || existingFiles[i].endsWith(".bmp") || existingFiles[i].endsWith(".png") || existingFiles[i].endsWith(".jpg")) {
                                            filtredExistingFiles.push(existingFiles[i]);
                                        }
                                    } else {
                                        filtredExistingFiles.push(existingFiles[i]);
                                    }
                                }
                            } else if(extractMediaTypeFromLink(hInstance.getValue(), hInstance.getCursor()) == '"license"') {
                                for(i = 0; i < existingFiles.length; i++) {
                                    filtredExistingFiles.push(existingFiles[i]);
                                }
                            } else if(extractMediaTypeFromLink(hInstance.getValue(), hInstance.getCursor()) == '"help"') {
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
                        }
                        
                        avaibleStrs = filter(filtredExistingFiles, tokenString, true);
                        
                        let arrayTypes = [];
                        for(i = 0; i < avaibleStrs.length; i++) {
                            arrayTypes[i] = "string";
                        }
                        
                        currentTokenType = "path";
                        
                        displayAutocomplete(avaibleStrs, arrayTypes);
                    }
                } else if(attributeName == "rel" && extractTagName(hInstance.getValue(), hInstance.getCursor()) == "") {
                    
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
        let clickedElement   = event.target;
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
