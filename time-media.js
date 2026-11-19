"use strict";
// Try the origin site's common upload locations before showing a neutral
// placeholder. This keeps official photo ownership and source attribution intact.
window.timeMediaFallback=function(img){
  const original=img.dataset.originalFile ||
    (img.getAttribute("src")||"").split("/").pop().split("?")[0];
  img.dataset.originalFile=original;
  const date=original.match(/^(\d{2})(\d{2})(\d{4})/);
  const paths=[];
  if(date){
    const y=date[3],m=date[2];
    paths.push("upload/"+y+"/"+m+"/"+original);
    paths.push("uploads/"+y+"/"+m+"/"+original);
    paths.push("storage/uploads/"+y+"/"+m+"/"+original);
    paths.push("storage/upload/"+y+"/"+m+"/"+original);
    paths.push("public/upload/"+y+"/"+m+"/"+original);
  }
  paths.push("upload/"+original);
  paths.push("uploads/"+original);
  const index=Number(img.dataset.tryIndex||0);
  if(index<paths.length){
    img.dataset.tryIndex=String(index+1);
    img.src="https://timecriteria.com/"+paths[index];
    return;
  }
  img.onerror=null;
  const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 280">'+
    '<rect width="400" height="280" fill="#f9ecee"/>'+
    '<circle cx="200" cy="103" r="43" fill="#dca4ad"/>'+
    '<path d="M98 267c0-80 204-80 204 0" fill="#dca4ad"/></svg>';
  img.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg);
};