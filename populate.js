async function grab() {
    console.log('request:', course, module, element);
    const url = "https://scs-technology-and-innovation.github.io/Content/CCCS" + course + '/M' + module + '/' + element + '.html';
    console.log(url);
    const content = document.getElementById("content");
    content.innerHTML = await (await fetch(url)).text();
}
var link = document.createElement('a');
link.style.display = 'none'; 
link.setAttribute('href', '#');
link.setAttribute('onclick', 'grab()'); 
document.body.appendChild(link);
link.click(); 



