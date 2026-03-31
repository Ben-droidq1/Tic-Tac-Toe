import './tictactoe.css'
import { useState } from 'react'
import ximg from './assets/x-solid.svg'
import oimg from './assets/o-solid.svg'

function TicTacToe() {
  const [board, setBoard] = useState(["", "", "", "", "", "", "", "", ""])
  let [count, setCount] = useState(0)
  let [lock, setLock] = useState(false)
  const [winner, setWinner] = useState("")
  const [mode, setMode] = useState("human") // "human" or "computer"
  const [difficulty, setDifficulty] = useState("hard") // "easy", "medium", "hard"
  const [humanWins, setHumanWins] = useState(0)
  const [computerWins, setComputerWins] = useState(0)
  const [isComputerTurn, setIsComputerTurn] = useState(false)

  const minimax = (board, depth, isMaximizing) => {
    const winner = checkWinner(board);
    if (winner === "o") return 10 - depth;
    if (winner === "x") return depth - 10;
    if (board.every(cell => cell !== "")) return 0;

    if (isMaximizing) {
      let bestScore = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (board[i] === "") {
          board[i] = "o";
          const score = minimax(board, depth + 1, false);
          board[i] = "";
          bestScore = Math.max(score, bestScore);
        }
      }
      return bestScore;
    } else {
      let bestScore = Infinity;
      for (let i = 0; i < 9; i++) {
        if (board[i] === "") {
          board[i] = "x";
          const score = minimax(board, depth + 1, true);
          board[i] = "";
          bestScore = Math.min(score, bestScore);
        }
      }
      return bestScore;
    }
  };

  const getBestMove = (board) => {
    const availableMoves = board.map((cell, index) => cell === "" ? index : null).filter(val => val !== null);
    
    if (difficulty === "easy") {
      // 20% chance of optimal move, 80% random
      if (Math.random() < 0.2) {
        return getOptimalMove(board);
      } else {
        return availableMoves[Math.floor(Math.random() * availableMoves.length)];
      }
    } else if (difficulty === "medium") {
      // 50% chance of optimal move, 50% random
      if (Math.random() < 0.5) {
        return getOptimalMove(board);
      } else {
        return availableMoves[Math.floor(Math.random() * availableMoves.length)];
      }
    } else {
      // Hard: always optimal
      return getOptimalMove(board);
    }
  };

  const getOptimalMove = (board) => {
    let bestScore = -Infinity;
    let move;
    for (let i = 0; i < 9; i++) {
      if (board[i] === "") {
        board[i] = "o";
        const score = minimax(board, 0, false);
        board[i] = "";
        if (score > bestScore) {
          bestScore = score;
          move = i;
        }
      }
    }
    return move;
  };

  const checkWinner = (board) => {
    const winConditions = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    for (let condition of winConditions) {
      const [a, b, c] = condition;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }
    return null;
  };

  const toggle = (num) => {
    if (lock || board[num] !== "" || isComputerTurn) {
      return;
    }
    const newBoard = [...board];
    if (mode === "human") {
      newBoard[num] = count % 2 === 0 ? "x" : "o";
    } else {
      // In computer mode, human is always X
      newBoard[num] = "x";
    }
    setBoard(newBoard);
    setCount(count + 1);
    checkWin(newBoard);
    if (!lock && mode === "computer") {
      setLock(true); // Lock board after human move
    }

    // If playing vs computer and it's computer's turn, make computer move
    if (mode === "computer" && !lock) {
      setIsComputerTurn(true);
      setTimeout(() => {
        const computerMove = getBestMove(newBoard);
        if (computerMove !== undefined) {
          const boardAfterComputer = [...newBoard];
          boardAfterComputer[computerMove] = "o";
          setBoard(boardAfterComputer);
          setCount(count + 2);
          checkWin(boardAfterComputer);
          if (!lock) {
            setLock(false); // Unlock board after computer move if game continues
          }
        }
        setIsComputerTurn(false);
      }, 2000); // Increased delay to 2 seconds
    }
  }

  const renderCell = (num) => {
    const isDisabled = isComputerTurn || lock;
    return (
      <div 
        className={`cell ${isDisabled ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`} 
        onClick={() => toggle(num)}
      >
        {board[num] === "x" && <img src={ximg} alt="x" className="w-10" />}
        {board[num] === "o" && <img src={oimg} alt="o" className="w-10" />}
      </div>
    );
  }

  const checkWin = (currentBoard) => {
    const win = checkWinner(currentBoard);
    if (win) {
      let winnerText;
      if (mode === "computer") {
        winnerText = win === "x" ? "You Win!" : "Computer Wins!";
      } else {
        winnerText = `${win.toUpperCase()} Wins!`;
      }
      setWinner(winnerText);
      setLock(true);
      if (mode === "computer") {
        if (win === "x") {
          setHumanWins(humanWins + 1);
        } else if (win === "o") {
          setComputerWins(computerWins + 1);
        }
      }
    } else if (currentBoard.every(cell => cell !== "")) {
      setWinner("It's a Draw!");
      setLock(true);
    }
  }

  const resetGame = () => {
    setBoard(["", "", "", "", "", "", "", "", ""]);
    setCount(0);
    setLock(false);
    setWinner("");
    setIsComputerTurn(false);
  }



            return(
        <div className='text-center mt-10 text-white px-4 sm:px-6 lg:px-8'>
            <h1 className='text-3xl sm:text-4xl lg:text-5xl font-mono font-bold mb-4'>Tic-Tac-Toe</h1>
            <div className='flex flex-col sm:flex-row justify-center items-center mb-4 space-y-2 sm:space-y-0 sm:space-x-4'>
                <button 
                    onClick={() => setMode("human")} 
                    className={`px-3 py-2 sm:px-4 sm:py-2 rounded text-sm sm:text-base ${mode === "human" ? "bg-blue-600" : "bg-gray-600"}`}
                >
                    Play vs Human
                </button>
                <button 
                    onClick={() => setMode("computer")} 
                    className={`px-3 py-2 sm:px-4 sm:py-2 rounded text-sm sm:text-base ${mode === "computer" ? "bg-blue-600" : "bg-gray-600"}`}
                >
                    Play vs Computer
                </button>
            </div>
            {mode === "computer" && (
                <div className='mb-4'>
                    <span className='text-white mr-2 text-sm sm:text-base'>Difficulty:</span>
                    <div className='flex flex-wrap justify-center space-x-2'>
                        <button 
                            onClick={() => setDifficulty("easy")} 
                            className={`px-2 py-1 sm:px-3 sm:py-1 rounded text-sm ${difficulty === "easy" ? "bg-green-600" : "bg-gray-600"}`}
                        >
                            Easy
                        </button>
                        <button 
                            onClick={() => setDifficulty("medium")} 
                            className={`px-2 py-1 sm:px-3 sm:py-1 rounded text-sm ${difficulty === "medium" ? "bg-yellow-600" : "bg-gray-600"}`}
                        >
                            Medium
                        </button>
                        <button 
                            onClick={() => setDifficulty("hard")} 
                            className={`px-2 py-1 sm:px-3 sm:py-1 rounded text-sm ${difficulty === "hard" ? "bg-red-600" : "bg-gray-600"}`}
                        >
                            Hard
                        </button>
                    </div>
                </div>
            )}
            {isComputerTurn && <h3 className='text-xl sm:text-2xl font-bold text-blue-400 mb-4 animate-pulse'>🤖 Computer's turn... Please wait</h3>}
            {winner && <h2 className='text-xl sm:text-2xl lg:text-3xl font-bold text-green-400 mb-4 win-message'>{winner}</h2>}
            <div className=' gap-2 mt-10 flex flex-row items-center justify-center '>


                <div className="row1">
                    {renderCell(0)}
                    {renderCell(1)}
                    {renderCell(2)}
                </div>

                  <div className="row2">
                    {renderCell(3)}
                    {renderCell(4)}
                    {renderCell(5)}
                </div>

                  <div className="row3">
                    {renderCell(6)}
                    {renderCell(7)}
                    {renderCell(8)}
                </div>

            </div><br></br>
            <div className='flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-4 mt-6'>
                <button onClick={resetGame} className='w-28 sm:w-32 bg-blue-900 hover:bg-blue-700 text-white font-bold py-2 px-3 sm:px-4 border border-blue-700 rounded text-sm sm:text-base'>
                    Reset
                </button>
            </div>






        </div>


    )

}
  
export default TicTacToe;