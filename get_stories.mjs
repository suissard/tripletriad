import qs from 'qs';

const query = qs.stringify({
  populate: {
    steps: {
      populate: {
        startDialogue: {
          populate: { card: { populate: ['image'] } }
        },
        endDialogue: {
          populate: { card: { populate: ['image'] } }
        }
      }
    }
  }
}, { encodeValuesOnly: true });

console.log(query);
fetch(`http://localhost:1337/api/stories?${query}`)
  .then(res => res.json())
  .then(data => console.log(JSON.stringify(data, null, 2)))
  .catch(console.error);
