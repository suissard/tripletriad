fetch('http://localhost:1337/api/stories?populate[steps][populate][startDialogue][populate][card][populate][0]=image&populate[steps][populate][endDialogue][populate][card][populate][0]=image')
  .then(res => res.json())
  .then(data => {
    if(data.data && data.data[0] && data.data[0].steps) {
      console.log(JSON.stringify(data.data[0].steps[0], null, 2));
    } else {
      console.log('No steps data:', JSON.stringify(data).slice(0, 500));
    }
  })
  .catch(console.error);
