import './tictactoe.css'
import { useState, useEffect } from 'react'
import io from 'socket.io-client'
import ximg from './assets/x-solid.svg'
import oimg from './assets/o-solid.svg'

function TicTacToe() {
  const [board, setBoard] = useState(["", "", "", "", "", "", "", "", ""])
  let [count, setCount] = useState(0)
  let [lock, setLock] = useState(false)
  const [winner, setWinner] = useState("")
  const [mode, setMode] = useState("local") // "local", "online"
  const [difficulty, setDifficulty] = useState("hard") // "easy", "medium", "hard"
  const [humanWins, setHumanWins] = useState(0)
  const [computerWins, setComputerWins] = useState(0)
  const [isComputerTurn, setIsComputerTurn] = useState(false)

  // Online multiplayer state
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [gameId, setGameId] = useState(null)
  const [playerSymbol, setPlayerSymbol] = useState(null)
  const [opponentName, setOpponentName] = useState("")
  const [isMyTurn, setIsMyTurn] = useState(false)
  const [gameStatus, setGameStatus] = useState("waiting") // "waiting", "playing", "finished"
  const [waitingMessage, setWaitingMessage] = useState("")

  // Username state
  const [playerName, setPlayerName] = useState("")
  const [showNameSetup, setShowNameSetup] = useState(true)

  // Socket connection
  useEffect(() => {
    if (mode === "online") {
      const serverUrl = import.meta.env.VITE_SERVER_URL || `http://${window.location.hostname}:3001`
      const newSocket = io(serverUrl)
      setSocket(newSocket)

      newSocket.on('connect', () => {
        setIsConnected(true)
        console.log('Connected to server')
      })

      newSocket.on('disconnect', () => {
        setIsConnected(false)
        console.log('Disconnected from server')
      })

      newSocket.on('waitingForOpponent', (data) => {
        setWaitingMessage(data.message)
        setGameStatus("waiting")
      })

      newSocket.on('gameStarted', (gameData) => {
        setGameId(gameData.id)
        setBoard(gameData.board)
        setGameStatus("playing")

        // Determine player info
        const isPlayer1 = gameData.players.player1.id === newSocket.id
        setPlayerSymbol(isPlayer1 ? 'X' : 'O')
        setOpponentName(isPlayer1 ? gameData.players.player2.username : gameData.players.player1.username)
        setIsMyTurn(gameData.currentTurn === (isPlayer1 ? 'X' : 'O'))

        // Set player names based on who we are
        if (isPlayer1) {
          setPlayerName(gameData.players.player1.username)
          setOpponentName(gameData.players.player2.username)
        } else {
          setPlayerName(gameData.players.player2.username)
          setOpponentName(gameData.players.player1.username)
        }
      })

      newSocket.on('gameUpdate', (gameData) => {
        setBoard(gameData.board)
        setIsMyTurn(gameData.currentTurn === playerSymbol)

        if (gameData.status === 'finished') {
          setGameStatus("finished")
          if (gameData.winner === 'draw') {
            setWinner("It's a Draw!")
          } else {
            const winnerName = gameData.winner === playerSymbol ? playerName : opponentName
            setWinner(`${winnerName} Wins!`)
          }
          setLock(true)
        }
      })

      newSocket.on('invalidMove', (data) => {
        alert(data.message)
      })

      newSocket.on('opponentDisconnected', () => {
        alert('Your opponent disconnected!')
        resetGame()
      })

      newSocket.on('gameEnded', () => {
        setTimeout(() => {
          resetGame()
        }, 2000)
      })

      return () => {
        newSocket.close()
      }
    }
  }, [mode, playerSymbol])

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

    if (mode === "online") {
      // Online multiplayer - send move to server
      if (socket && gameId && isMyTurn) {
        socket.emit('makeMove', { gameId, position: num });
      }
      return;
    }

    const newBoard = [...board];
    if (mode === "local") {
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
    const isDisabled = isComputerTurn || lock || (mode === "online" && !isMyTurn);
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
        winnerText = win === "x" ? `${playerName} Wins!` : "Computer Wins!";
      } else {
        winnerText = win === "x" ? `${playerName} Wins!` : `${opponentName} Wins!`;
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
      // Automatically restart after 3 seconds
      setTimeout(() => {
        resetGame();
      }, 3000);
    } else if (currentBoard.every(cell => cell !== "")) {
      setWinner("It's a Draw!");
      setLock(true);
      // Automatically restart after 3 seconds
      setTimeout(() => {
        resetGame();
      }, 3000);
    }
  }

  const resetGame = () => {
    setBoard(["", "", "", "", "", "", "", "", ""]);
    setCount(0);
    setLock(false);
    setWinner("");
    setIsComputerTurn(false);
    // Reset online multiplayer state
    setGameId(null)
    setPlayerSymbol(null)
    setOpponentName("")
    setIsMyTurn(false)
    setGameStatus("waiting")
    setWaitingMessage("")  }
  const startGame = () => {
    if (mode === "online") {
      if (socket && playerName.trim()) {
        socket.emit('joinGame', { username: playerName.trim() })
        setShowNameSetup(false)
      }
    } else {
      setShowNameSetup(false)
      resetGame()
    }
  }


            return(
        <div className='text-center mt-10 text-white px-4 sm:px-6 lg:px-8'>
            {showNameSetup ? (
                <div className='max-w-md mx-auto bg-gray-800 p-6 rounded-lg shadow-lg'>
                    <h2 className='text-2xl font-bold mb-6'>Game Setup</h2>

                    {/* Game Mode Selection */}
                    <div className='mb-6'>
                        <label className='block text-sm font-medium mb-2'>Game Mode</label>
                        <div className='flex space-x-2'>
                            <button
                                onClick={() => setMode("local")}
                                className={`px-3 py-2 rounded text-sm ${mode === "local" ? "bg-blue-600" : "bg-gray-600"}`}
                            >
                                Local Play
                            </button>
                            <button
                                onClick={() => setMode("computer")}
                                className={`px-3 py-2 rounded text-sm ${mode === "computer" ? "bg-blue-600" : "bg-gray-600"}`}
                            >
                                vs Computer
                            </button>
                            <button
                                onClick={() => setMode("online")}
                                className={`px-3 py-2 rounded text-sm ${mode === "online" ? "bg-blue-600" : "bg-gray-600"}`}
                            >
                                Online Multiplayer
                            </button>
                        </div>
                    </div>

                    {/* Username Input */}
                    <div className='space-y-4'>
                        {mode === "online" ? (
                            <div>
                                <label className='block text-sm font-medium mb-2'>Your Username</label>
                                <input
                                    type='text'
                                    value={playerName}
                                    onChange={(e) => setPlayerName(e.target.value)}
                                    className='w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500'
                                    placeholder='Enter your username'
                                />
                                {!isConnected && mode === "online" && (
                                    <p className='text-red-400 text-sm mt-2'>Connecting to server...</p>
                                )}
                            </div>
                        ) : (
                            <>
                                <div>
                                    <label className='block text-sm font-medium mb-2'>Player 1 (X)</label>
                                    <input
                                        type='text'
                                        value={playerName}
                                        onChange={(e) => setPlayerName(e.target.value)}
                                        className='w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500'
                                        placeholder='Enter name'
                                    />
                                </div>
                                {mode === "local" && (
                                    <div>
                                        <label className='block text-sm font-medium mb-2'>Player 2 (O)</label>
                                        <input
                                            type='text'
                                            value={opponentName}
                                            onChange={(e) => setOpponentName(e.target.value)}
                                            className='w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500'
                                            placeholder='Enter name'
                                        />
                                    </div>
                                )}
                            </>
                        )}

                        {/* Computer Difficulty Selection */}
                        {mode === "computer" && (
                            <div>
                                <label className='block text-sm font-medium mb-2'>Difficulty</label>
                                <div className='flex flex-wrap justify-center space-x-2'>
                                    <button
                                        onClick={() => setDifficulty("easy")}
                                        className={`px-2 py-1 rounded text-sm ${difficulty === "easy" ? "bg-green-600" : "bg-gray-600"}`}
                                    >
                                        Easy
                                    </button>
                                    <button
                                        onClick={() => setDifficulty("medium")}
                                        className={`px-2 py-1 rounded text-sm ${difficulty === "medium" ? "bg-yellow-600" : "bg-gray-600"}`}
                                    >
                                        Medium
                                    </button>
                                    <button
                                        onClick={() => setDifficulty("hard")}
                                        className={`px-2 py-1 rounded text-sm ${difficulty === "hard" ? "bg-red-600" : "bg-gray-600"}`}
                                    >
                                        Hard
                                    </button>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={startGame}
                            disabled={mode === "online" && (!playerName.trim() || !isConnected)}
                            className='w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded mt-4'
                        >
                            {mode === "online" ? "Find Match" : "Start Game"}
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <h1 className='text-3xl sm:text-4xl lg:text-5xl font-mono font-bold mb-4'>Tic-Tac-Toe</h1>

                    {/* Player Display */}
                    <div className='mb-4 text-lg'>
                        {mode === "online" ? (
                            <>
                                <span className={`font-bold ${playerSymbol === 'X' ? 'text-blue-400' : 'text-gray-400'}`}>
                                    {playerName} (X)
                                </span>
                                <span className='mx-2 text-white'>vs</span>
                                <span className={`font-bold ${playerSymbol === 'O' ? 'text-red-400' : 'text-gray-400'}`}>
                                    {opponentName} (O)
                                </span>
                                {isMyTurn && <span className='ml-2 text-green-400'>← Your Turn</span>}
                                {!isMyTurn && gameStatus === "playing" && <span className='ml-2 text-yellow-400'>Waiting for opponent...</span>}
                            </>
                        ) : (
                            <>
                                <span className='text-blue-400'>{playerName} (X)</span>
                                {mode === "local" && (
                                    <> vs <span className='text-red-400'>{opponentName} (O)</span></>
                                )}
                                {mode === "computer" && (
                                    <> vs <span className='text-red-400'>Computer (O)</span></>
                                )}
                            </>
                        )}
                    </div>

                    {/* Game Mode Buttons (only show if not in online game) */}
                    {mode !== "online" && (
                        <div className='flex flex-col sm:flex-row justify-center items-center mb-4 space-y-2 sm:space-y-0 sm:space-x-4'>
                            <button
                                onClick={() => { setMode("local"); setShowNameSetup(true); }}
                                className={`px-3 py-2 sm:px-4 sm:py-2 rounded text-sm sm:text-base ${mode === "local" ? "bg-blue-600" : "bg-gray-600"}`}
                            >
                                Local Play
                            </button>
                            <button
                                onClick={() => { setMode("computer"); setShowNameSetup(true); }}
                                className={`px-3 py-2 sm:px-4 sm:py-2 rounded text-sm sm:text-base ${mode === "computer" ? "bg-blue-600" : "bg-gray-600"}`}
                            >
                                vs Computer
                            </button>
                            <button
                                onClick={() => { setMode("online"); setShowNameSetup(true); }}
                                className={`px-3 py-2 sm:px-4 sm:py-2 rounded text-sm sm:text-base ${mode === "online" ? "bg-blue-600" : "bg-gray-600"}`}
                            >
                                Online Multiplayer
                            </button>
                        </div>
                    )}

                    {/* Waiting message for online games */}
                    {mode === "online" && gameStatus === "waiting" && (
                        <div className='text-center mb-4'>
                            <h3 className='text-xl font-bold text-blue-400 mb-2'>Finding Match...</h3>
                            <p className='text-gray-300'>{waitingMessage}</p>
                            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mt-2'></div>
                        </div>
                    )}

                    {/* Computer Difficulty (only for computer mode) */}
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
            <div className='gap-2 mt-10 flex flex-row items-center justify-center relative'>
              {winner ? (
                <div className='absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 rounded-lg z-10'>
                  <h2 className='text-2xl sm:text-3xl lg:text-4xl font-bold text-green-400 win-message text-center px-4'>
                    {winner}
                  </h2>
                </div>
              ) : null}
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
                </>
            )}
        </div>
    )

}

  
export default TicTacToe;