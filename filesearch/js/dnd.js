$(document).ready(function() {
  var dropbox = document.getElementById("dropbox")
  dropbox.addEventListener("dragenter", dragEnter, false);
  dropbox.addEventListener("dragexit", dragExit, false);
  dropbox.addEventListener("dragover", dragOver, false);
  dropbox.addEventListener("drop", drop, false);
});

function dragEnter(evt) {
  evt.stopPropagation();
  evt.preventDefault();
}

function dragExit(evt) {
  evt.stopPropagation();
  evt.preventDefault();
}

function dragOver(evt) {
  evt.stopPropagation();
  evt.preventDefault();
}

function drop(evt) {
  evt.stopPropagation();
  evt.preventDefault();

  var files = evt.dataTransfer.files;
  var count = files.length;

  if (count > 0)
    handleFiles(files);
}

function handleFiles(files) {
  var file = files[0];
  var reader = new FileReader();

  reader.onloadstart = handleReaderStart;

  reader.onloadend = (function(file) {
    return function(evt) {
      C9.api.index.Document({
        collection: "demos", type: "files", id: file.name,
        source: {
          title: file.name,
          content: evt.target.result.split(",")[1]
        }
      }).put(function(data){
           $("#droplabel").html("Drop file here");
           setTimeout("dosearch()",1000);
      });
    }
  })(file);

  reader.readAsDataURL(file);
}

function handleReaderStart(evt) {
  $("#droplabel").html("<img src='/images/spinner.gif'/>");
}

