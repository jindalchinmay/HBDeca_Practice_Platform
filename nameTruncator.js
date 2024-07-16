function getName(name){ // to ensure only PDSB kids have access to this
  var finalName = "";

  for(var i = 0; i < name.length; i++){
    var currentLetter = name[i];
    if(currentLetter != " ") {
      finalName = finalName + currentLetter;
    }
    else{
      break;
    }
  }

  if(finalName.length > 28){
    finalName = finalName.substring(0,24) + "...";
  }

  return finalName;
}

module.exports = getName;
