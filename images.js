'use strict';

let images = {
  nameMap: {},
  loadingCount: 0,
  isDoneLoading: function() {
    return images.loadingCount === 0;
  },
  loadSingleImage: function(url, name) {
    let img = new Image();
    images.loadingCount++;
    img.onload = () => {
      images.nameMap[name] = {sx:0, sy: 0, width: img.width, height: img.height, img: img};
      images.loadingCount--;
    };
    img.src = url;
  },
  loadSpriteSheet: function(jsonurl) {
    images.loadingCount++;

    let xhr = new XMLHttpRequest();
    xhr.open('GET', jsonurl, true);
    xhr.responseType = 'json';
    xhr.onload = () => {
      let status = xhr.status;
      if (status === 200) {
        let json = xhr.response;
        images.loadSpriteImage(json);
      } else {
        //do something with the error
      }
    };
    xhr.send();
  },
  loadSpriteImage: function(jsonData) {
    let img = new Image();
    img.onload = () => {
      jsonData.spriteList.forEach(s => {
        images.nameMap[s.name] = {img: img, sx: s.x, sy: s.y, width: s.width, height: s.height};
      });
      images.loadingCount--;
    };
    img.src = jsonData.imgUrl;
  },
  draw: function(ctx, name, x, y, w, h) {
    //x,y is the upper left corner
    /*
    void ctx.drawImage(image, dx, dy);
    void ctx.drawImage(image, dx, dy, dWidth, dHeight);
    void ctx.drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
    */
    let i = images.nameMap[name];
    let width = w || i.width;
    let height = h || i.height;
    ctx.drawImage(i.img, i.sx, i.sy, i.width, i.height, x, y, width, height);
  },
  getImageSize: function(name) {
    let i = images.nameMap[name];
    return {width: i.width, height: i.height};
  }
};
