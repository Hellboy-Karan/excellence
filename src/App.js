import './App.css';
import EvenNumber from './components/evenNumber';
import Maximumno from './components/consecutive';
import Duplicate from './components/findduplicate';
import SortArray from './components/Sortarray';
import TodoList from "./components/TodoList";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link
} from "react-router-dom";

function App() {
  return (
    <div className="App">
      <Router>
        <div>
          <nav>
            <ul>
              <li>
                <Link to="/">Question1</Link>
              </li>
              <li>
                <Link to="/consecutive">Question2</Link>
              </li>
              <li>
                <Link to="/repeatednumber">Question3</Link>
              </li>
              <li>
                <Link to="#">Question4</Link>
              </li>
              <li>
                <Link to="/SortArray">Question5</Link>
              </li>
              <li>
                <Link to="/todolist">TodoList</Link>
              </li>
            </ul>
          </nav>
          <Switch>
            <Route path="/" exact><EvenNumber /></Route>
            <Route path="/consecutive" exact><Maximumno /></Route>
            <Route path="/repeatednumber" exact><Duplicate /></Route>
            <Route path="/todolist" exact><TodoList /></Route>
          </Switch>
        </div>
      </Router>
    </div>
  );
}

export default App;
