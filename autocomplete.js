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
    for(i = 0; i < arrayElements.length; i++) {
        $("#_list").append('<div class="item" id="_' + i + '"><span class="span">' + arrayElements[i] + '</span><i class="' + arrayTypes[i] + '"></i></div>');
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

$(document).ready(function() {
    for(i = 0; i < 500; i++) {
        MAX_TAGS.push(i);
    }
    
    $(".CodeMirror").height($(window).height());
    $(window).resize(function() {
        $(".CodeMirror").height($(window).height());
    });
    hInstance.on("keyup", function(editor, event) {
        console.log(hInstance.getTokenAt(hInstance.getCursor()));
        
        if(hInstance.getModeAt(hInstance.getCursor()).name != "xml" && hInstance.getModeAt(hInstance.getCursor()).name != "javascript" && hInstance.getModeAt(hInstance.getCursor()).name != "css") { $("#_list").css("display", "none"); }
        if(hInstance.getModeAt(hInstance.getCursor()).name == "xml") {
            let avaibleTags = [];
            let avaibleAtts = [];
            let avaibleStrs = [];

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
                if(attributeName == "src" || attributeName == "href") {
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
                        
                        avaibleStrs = filter(existingFiles, fname, true);
                        
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
                        
                        avaibleStrs = filter(existingFiles, tokenString, true);
                        
                        let arrayTypes = [];
                        for(i = 0; i < avaibleStrs.length; i++) {
                            arrayTypes[i] = "string";
                        }
                        
                        currentTokenType = "path";
                        
                        displayAutocomplete(avaibleStrs, arrayTypes);
                    }
                }
            } if(avaibleStrs[0] == "") {
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
