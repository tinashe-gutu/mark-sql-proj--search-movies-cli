import readlineSync from "readline-sync";
import { Client, QueryResult } from "pg";

//As your database is on your local machine, with default port,
//and default username and password,
//we only need to specify the (non-default) database name.
const client = new Client({ database: "omdb" });
console.log("Welcome to search-movies-cli!");
async function SearchDb() {
  await client.connect();
  try {
    while (true) {
      const options = ["Search", "See Favourites"];
      const option = readlineSync.keyInSelect(options, "Choose an action!");
      if (option === 0) {
        const res = await fetchSearchedMovies();
        console.table(res.rows);
        if (res.rows.length) {
          await addMovieToFavourites(res.rows);
        }
      } else if (option === 1) {
        await viewFavouriteMovies();
      } else {
        break;
      }
    }
  } catch (error) {
    console.log("something went wrong!", error);
    throw error;
  } finally {
    await client.end();
  }
}

async function viewFavouriteMovies() {
  console.log("Selecting favourites...\n");
  const selectMovies =
    "SELECT DISTINCT movies.id,name,date,runtime,budget,revenue,vote_average,votes_count FROM movies JOIN favourites ON movies.id = favourites.movie_id;";
  let res = await client.query(selectMovies);
  console.log("---Favourites---\n");
  console.table(res.rows);
}

async function addMovieToFavourites(rowsArr: any[]) {
  try {
    const names = rowsArr.map((el) => el.name);
    const selectedFavIndex = readlineSync.keyInSelect(
      names,
      "Add movies to favoutes"
    );
    if (selectedFavIndex === -1) {
      console.log(selectedFavIndex);
      return;
    }
    const currFavsID = await client.query("SELECT id FROM favourites");
    const ID = currFavsID.rows.length
      ? currFavsID.rows[currFavsID.rows.length - 1].id + 1
      : 0;
    console.log(ID);
    const values = [ID, rowsArr[selectedFavIndex].id];
    const insertFavourites =
      "INSERT INTO favourites VALUES ($1, $2) RETURNING *";
    const res = await client.query(insertFavourites, values);
    console.log(res);
  } catch (error) {
    console.log("Issues with adding favourites", error);
    throw error;
  }
}

async function fetchSearchedMovies() {
  const search = readlineSync.question("Search Movies: ");
  const text =
    "SELECT id,name,date,runtime,budget,revenue,vote_average,votes_count FROM movies WHERE name LIKE $1 AND kind=$2 ORDER BY date DESC LIMIT 10 ";
  const values = [`%${search}%`, "movie"];
  let res = await client.query(text, values);
  return res;
}

SearchDb();
