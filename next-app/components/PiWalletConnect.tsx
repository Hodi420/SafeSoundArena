import React, { useState, useEffect } from 'react';

// Dummy transaction data for demonstration
const dummyTransactions = [
  { id: 'tx1', amount: 0.01, currency: 'PI', status: 'Completed', date: '2024-06-01', memo: 'Test payment 1', details: 'Sent to Alice' },
  { id: 'tx2', amount: 0.02, currency: 'BTC', status: 'Pending', date: '2024-06-02', memo: 'Test payment 2', details: 'Received from Bob' },
  { id: 'tx3', amount: 0.005, currency: 'ETH', status: 'Cancelled', date: '2024-06-03', memo: 'Test payment 3', details: 'Refunded' }
];

declare global {
  interface Window {
    Pi: any;
  }
}

export default function PiWalletConnect() {
  const [piUser, setPiUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [paymentLoading, setPaymentLoading] = useState<boolean>(false);
  const [balance, setBalance] = useState<number|null>(null);
  const [activeTab, setActiveTab] = useState<'wallet'|'history'|'profile'>('wallet');
  const [transactions, setTransactions] = useState<any[]>(dummyTransactions);
  const [notification, setNotification] = useState<string|null>(null);
  const [currencies] = useState(['PI', 'BTC', 'ETH']);
  const [selectedCurrency, setSelectedCurrency] = useState('PI');
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortField, setSortField] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc'|'desc'>('desc');
  const [selectedTx, setSelectedTx] = useState<any|null>(null);
  const [userProfile, setUserProfile] = useState<any|null>(null);
  
  // Command control and voting system states
  const [commandInput, setCommandInput] = useState<string>('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [proposedChanges, setProposedChanges] = useState<{id: string, description: string, votes: {username: string, vote: 'yes'|'no'}[], type: string, status: 'pending'|'executed'|'rejected'}[]>([]);
  const [activeProposal, setActiveProposal] = useState<string|null>(null);
  const [showCommandPanel, setShowCommandPanel] = useState<boolean>(false);
  const [commandError, setCommandError] = useState<string|null>(null);
  const [commandSuccess, setCommandSuccess] = useState<string|null>(null);
  const [votingThreshold] = useState<number>(2); // Minimum votes needed to execute a proposal
  
  // Computed property for filtered and sorted transactions
  const filteredSortedTransactions = React.useMemo(() => {
    // First filter by currency
    let filtered = transactions.filter(tx => {
      if (selectedCurrency === 'All') return true;
      return tx.currency === selectedCurrency;
    });
    
    // Then filter by status
    filtered = filtered.filter(tx => {
      if (filterStatus === 'All') return true;
      return tx.status === filterStatus;
    });
    
    // Then sort by the selected field and order
    return filtered.sort((a, b) => {
      if (sortField === 'date') {
        // Convert dates to timestamps for comparison
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      } else if (sortField === 'amount') {
        return sortOrder === 'asc' ? a.amount - b.amount : b.amount - a.amount;
      }
      return 0;
    });
  }, [transactions, selectedCurrency, filterStatus, sortField, sortOrder]);

  const handleConnect = () => {
    setLoading(true);
    setError(null);
    if (!window.Pi) {
      setError('Pi SDK not loaded.');
      setLoading(false);
      return;
    }
    
    // Add responsive styles for mobile
    const connectButton = document.querySelector('.connect-button');
    if (connectButton) {
      const isMobile = window.innerWidth <= 768;
      connectButton.style.padding = isMobile ? '4% 8%' : '3% 6%';
      connectButton.style.fontSize = isMobile ? '4vw' : '2.5vw';
      connectButton.style.minWidth = '100%';
      connectButton.style.margin = '2vh 0';
      connectButton.style.borderRadius = '4vw';
      connectButton.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    }
    window.Pi.authenticate(['username', 'payments'], (auth: any) => {
      setPiUser(auth.user);
      setError(null);
      setLoading(false);
      // Simulate fetching wallet balance
      setTimeout(() => setBalance(3.1415), 800);
      setNotification('Successfully connected to Pi Wallet!');
      
      // Add animation for successful connection
      const connectButton = document.querySelector('.connect-button');
      if (connectButton) {
        connectButton.classList.add('animate-bounce');
        setTimeout(() => {
          connectButton.classList.remove('animate-bounce');
        }, 1500);
      }
      
      // Add haptic feedback for mobile
      if ('vibrate' in navigator) {
        navigator.vibrate(100);
      }
    }, (err: any) => {
      setError('Pi authentication failed: ' + err);
      setLoading(false);
    });
  };

  const handlePayment = () => {
    setPaymentStatus(null);
    setPaymentLoading(true);
    
    // Add responsive styles for mobile
    const paymentButton = document.querySelector('.payment-button');
    if (paymentButton) {
      paymentButton.style.padding = '16px 32px';
      paymentButton.style.fontSize = '18px';
      paymentButton.style.minWidth = '100%';
      paymentButton.style.margin = '12px 0';
      paymentButton.style.borderRadius = '16px';
      paymentButton.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    }
    
    // Add haptic feedback for mobile
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    
    if (!window.Pi || !piUser) {
      setPaymentStatus('Connect your Pi Wallet first.');
      setPaymentLoading(false);
      return;
    }
    window.Pi.createPayment(
      {
        amount: 0.01, // Test amount
        memo: 'Test payment from SafeSoundArena',
        metadata: { test: true }
      },
      {
        onReadyForServerApproval: (paymentId: string) => {
          setPaymentStatus('Payment ready for approval: ' + paymentId);
        },
        onReadyForServerCompletion: (paymentId: string, txid: string) => {
          setPaymentStatus('Payment completed! Payment ID: ' + paymentId + ', TxID: ' + txid);
          setPaymentLoading(false);
          setTransactions(prev => [
            { id: paymentId, amount: 0.01, status: 'Completed', date: new Date().toISOString().slice(0,10), memo: 'Test payment from SafeSoundArena' },
            ...prev
          ]);
          setBalance(b => b !== null ? b - 0.01 : null);
          setNotification('Payment sent successfully!');
      
      // Add animation for successful payment
      const paymentButton = document.querySelector('.payment-button');
      if (paymentButton) {
        paymentButton.classList.add('animate-ping');
        setTimeout(() => {
          paymentButton.classList.remove('animate-ping');
        }, 500);
      }
        },
        onCancel: (paymentId: string) => {
          setPaymentStatus('Payment cancelled: ' + paymentId);
          setPaymentLoading(false);
          setTransactions(prev => [
            { id: paymentId, amount: 0.01, status: 'Cancelled', date: new Date().toISOString().slice(0,10), memo: 'Test payment from SafeSoundArena' },
            ...prev
          ]);
        },
        onError: (err: any) => {
          setPaymentStatus('Payment error: ' + err);
          setPaymentLoading(false);
          setNotification('Payment failed: ' + err);
        }
      }
    );
  };

  // Command parsing and execution
  const parseCommand = (input: string) => {
    const trimmedInput = input.trim();
    const parts = trimmedInput.split(' ');
    const command = parts[0].toLowerCase();
    
    // Reset command status messages
    setCommandError(null);
    setCommandSuccess(null);
    
    // Add command to history
    setCommandHistory(prev => [...prev, input]);
    
    // Process different commands
    switch(command) {
      case '/help':
        return 'Available commands:\n/help - Show this help\n/propose <type> <description> - Create a new proposal (types: feature, bugfix, policy)\n/vote <id> <yes|no> - Vote on a proposal\n/list - List all proposals\n/status <id> - Check detailed status of a proposal\n/execute <id> - Execute approved proposal\n/reject <id> - Reject a proposal\n/clear - Clear command history';
      
      case '/propose':
        if (parts.length < 3) {
          setCommandError('Missing proposal type or description');
          return 'Error: Usage: /propose <type> <description> - Types: feature, bugfix, policy';
        }
        
        const proposalType = parts[1].toLowerCase();
        if (!['feature', 'bugfix', 'policy'].includes(proposalType)) {
          setCommandError('Invalid proposal type');
          return 'Error: Proposal type must be one of: feature, bugfix, policy';
        }
        
        const description = parts.slice(2).join(' ');
        const id = 'prop-' + Date.now().toString(36);
        
        if (!piUser) {
          setCommandError('You must connect your wallet to create proposals');
          return 'Error: You must connect your wallet to create proposals';
        }
        
        setProposedChanges(prev => [...prev, {
          id,
          description,
          type: proposalType,
          status: 'pending',
          votes: [{
            username: piUser.username,
            vote: 'yes' // Creator automatically votes yes
          }]
        }]);
        
        setCommandSuccess(`Proposal created with ID: ${id}`);
        return `Proposal created with ID: ${id} (Type: ${proposalType})`;
      
      case '/vote':
        if (parts.length < 3) {
          setCommandError('Missing proposal ID or vote');
          return 'Error: Usage: /vote <id> <yes|no>';
        }
        
        const propId = parts[1];
        const vote = parts[2].toLowerCase();
        
        if (vote !== 'yes' && vote !== 'no') {
          setCommandError('Vote must be "yes" or "no"');
          return 'Error: Vote must be "yes" or "no"';
        }
        
        if (!piUser) {
          setCommandError('You must connect your wallet to vote');
          return 'Error: You must connect your wallet to vote';
        }
        
        // Find the proposal
        const proposalIndex = proposedChanges.findIndex(p => p.id === propId);
        if (proposalIndex === -1) {
          setCommandError(`Proposal ${propId} not found`);
          return `Error: Proposal ${propId} not found`;
        }
        
        // Check if proposal is still pending
        if (proposedChanges[proposalIndex].status !== 'pending') {
          setCommandError(`Proposal ${propId} is already ${proposedChanges[proposalIndex].status}`);
          return `Error: Cannot vote on a proposal that is already ${proposedChanges[proposalIndex].status}`;
        }
        
        // Check if user already voted
        const proposal = proposedChanges[proposalIndex];
        const existingVoteIndex = proposal.votes.findIndex(v => v.username === piUser.username);
        
        // Update votes
        const updatedProposals = [...proposedChanges];
        if (existingVoteIndex >= 0) {
          // Update existing vote
          updatedProposals[proposalIndex].votes[existingVoteIndex].vote = vote as 'yes'|'no';
          setCommandSuccess(`Vote updated to: ${vote} for proposal ${propId}`);
          return `Vote updated to: ${vote} for proposal ${propId}`;
        } else {
          // Add new vote
          updatedProposals[proposalIndex].votes.push({
            username: piUser.username,
            vote: vote as 'yes'|'no'
          });
          setCommandSuccess(`Vote recorded: ${vote} for proposal ${propId}`);
        }
        
        setProposedChanges(updatedProposals);
        return `Vote recorded: ${vote} for proposal ${propId}`;
      
      case '/list':
        if (proposedChanges.length === 0) {
          return 'No active proposals';
        }
        
        return proposedChanges.map(p => {
          const yesVotes = p.votes.filter(v => v.vote === 'yes').length;
          const noVotes = p.votes.filter(v => v.vote === 'no').length;
          const statusEmoji = p.status === 'executed' ? '✅' : p.status === 'rejected' ? '❌' : '⏳';
          return `${statusEmoji} ID: ${p.id} - [${p.type}] ${p.description} (Yes: ${yesVotes}, No: ${noVotes})`;
        }).join('\n');
      
      case '/status':
        if (parts.length < 2) {
          setCommandError('Missing proposal ID');
          return 'Error: Usage: /status <id>';
        }
        
        const statusId = parts[1];
        const statusProposal = proposedChanges.find(p => p.id === statusId);
        
        if (!statusProposal) {
          setCommandError(`Proposal ${statusId} not found`);
          return `Error: Proposal ${statusId} not found`;
        }
        
        const statusYesVotes = statusProposal.votes.filter(v => v.vote === 'yes').length;
        const statusNoVotes = statusProposal.votes.filter(v => v.vote === 'no').length;
        const statusVoters = statusProposal.votes.map(v => `${v.username} (${v.vote})`).join(', ');
        
        return `Proposal: ${statusProposal.id}\n` +
               `Type: ${statusProposal.type}\n` +
               `Description: ${statusProposal.description}\n` +
               `Status: ${statusProposal.status}\n` +
               `Yes votes: ${statusYesVotes}\n` +
               `No votes: ${statusNoVotes}\n` +
               `Voters: ${statusVoters}\n` +
               `Required votes to execute: ${votingThreshold}`;
      
      case '/execute':
        if (parts.length < 2) {
          setCommandError('Missing proposal ID');
          return 'Error: Usage: /execute <id>';
        }
        
        const execId = parts[1];
        const execProposal = proposedChanges.find(p => p.id === execId);
        
        if (!execProposal) {
          setCommandError(`Proposal ${execId} not found`);
          return `Error: Proposal ${execId} not found`;
        }
        
        if (execProposal.status !== 'pending') {
          setCommandError(`Proposal ${execId} is already ${execProposal.status}`);
          return `Error: Cannot execute a proposal that is already ${execProposal.status}`;
        }
        
        const yesVotes = execProposal.votes.filter(v => v.vote === 'yes').length;
        const noVotes = execProposal.votes.filter(v => v.vote === 'no').length;
        
        if (yesVotes <= noVotes) {
          setCommandError(`Proposal ${execId} does not have majority approval`);
          return `Error: Proposal ${execId} does not have majority approval (Yes: ${yesVotes}, No: ${noVotes})`;
        }
        
        if (yesVotes < votingThreshold) {
          setCommandError(`Proposal ${execId} needs at least ${votingThreshold} yes votes`);
          return `Error: Proposal ${execId} needs at least ${votingThreshold} yes votes (current: ${yesVotes})`;
        }
        
        // Update proposal status
        const executedProposals = [...proposedChanges];
        const execIndex = executedProposals.findIndex(p => p.id === execId);
        executedProposals[execIndex].status = 'executed';
        setProposedChanges(executedProposals);
        
        // Set as active proposal (this would trigger the actual change implementation)
        setActiveProposal(execId);
        
        // Implement the actual change based on proposal type
        const implementationResult = implementProposal(execProposal);
        
        setCommandSuccess(`Executed proposal: ${execId}`);
        return `Executing proposal: ${execId} - ${execProposal.description}\n${implementationResult}`;
      
      case '/reject':
        if (parts.length < 2) {
          setCommandError('Missing proposal ID');
          return 'Error: Usage: /reject <id>';
        }
        
        const rejectId = parts[1];
        const rejectProposal = proposedChanges.find(p => p.id === rejectId);
        
        if (!rejectProposal) {
          setCommandError(`Proposal ${rejectId} not found`);
          return `Error: Proposal ${rejectId} not found`;
        }
        
        if (rejectProposal.status !== 'pending') {
          setCommandError(`Proposal ${rejectId} is already ${rejectProposal.status}`);
          return `Error: Cannot reject a proposal that is already ${rejectProposal.status}`;
        }
        
        // Update proposal status
        const rejectedProposals = [...proposedChanges];
        const rejectIndex = rejectedProposals.findIndex(p => p.id === rejectId);
        rejectedProposals[rejectIndex].status = 'rejected';
        setProposedChanges(rejectedProposals);
        
        setCommandSuccess(`Rejected proposal: ${rejectId}`);
        return `Rejected proposal: ${rejectId} - ${rejectProposal.description}`;
      
      case '/clear':
        setCommandHistory([]);
        setCommandSuccess('Command history cleared');
        return 'Command history cleared';
      
      default:
        setCommandError(`Unknown command: ${command}`);
        return `Unknown command: ${command}. Type /help for available commands.`;
    }
  };
  
  // Function to implement proposal changes
  const implementProposal = (proposal: any) => {
    // This function would contain the actual implementation logic for different proposal types
    switch(proposal.type) {
      case 'feature':
        // Simulate adding a new feature
        return `Feature implementation started: ${proposal.description}`;
      
      case 'bugfix':
        // Simulate fixing a bug
        return `Bug fix applied: ${proposal.description}`;
      
      case 'policy':
        // Simulate changing a policy
        return `Policy updated: ${proposal.description}`;
      
      default:
        return `Implementation for ${proposal.type} not defined`;
    }
  };
  
  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim()) return;
    
    // Reset previous command status
    setCommandError(null);
    setCommandSuccess(null);
    
    const result = parseCommand(commandInput);
    
    // Only set notification for non-command panel messages
    if (!showCommandPanel) {
      setNotification(result);
    }
    
    setCommandInput('');
  };
  
  const handleTabChange = (tab: 'wallet'|'history'|'profile') => {
    setActiveTab(tab);
    setNotification(null);
    setError(null);
    setPaymentStatus(null);
  };
  
  // Handle currency filter change
  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCurrency(e.target.value);
    setSelectedTx(null);
  };
  
  // Handle status filter change
  const handleStatusFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterStatus(e.target.value);
    setSelectedTx(null);
  };
  
  // Handle sort field change
  const handleSortField = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortField(e.target.value);
  };
  
  // Handle sort order change
  const handleSortOrder = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortOrder(e.target.value as 'asc'|'desc');
  };
  
  // Handle transaction click to view details
  const handleTxClick = (tx: any) => {
    setSelectedTx(tx);
  };
  
  // Handle closing transaction details
  const handleCloseTx = () => {
    setSelectedTx(null);
  };

  // Simulate balance refresh
  const handleRefreshBalance = () => {
    setNotification('Refreshing balance...');
    setTimeout(() => {
      setBalance(3.1415 + Math.random() * 0.01 - 0.005);
      setNotification('Balance updated!');
    }, 1000);
  };
  
  // Handle active proposal implementation
  useEffect(() => {
    if (activeProposal) {
      const proposal = proposedChanges.find(p => p.id === activeProposal);
      if (proposal && proposal.status === 'executed') {
        // Apply the proposal changes based on type
        switch(proposal.type) {
          case 'feature':
            // Simulate feature implementation
            setNotification(`Implementing feature: ${proposal.description}`);
            break;
          case 'bugfix':
            // Simulate bug fix
            setNotification(`Applying bugfix: ${proposal.description}`);
            break;
          case 'policy':
            // Simulate policy change
            setNotification(`Updating policy: ${proposal.description}`);
            break;
        }
        
        // Clear active proposal after implementation
        setTimeout(() => {
          setActiveProposal(null);
          setNotification(`Successfully implemented proposal: ${proposal.id}`);
        }, 2000);
      }
    }
  }, [activeProposal, proposedChanges]);

  // Responsive styles based on screen size with proper React hooks
  const [isMobile, setIsMobile] = useState(false);
  
  // Initialize mobile state and add resize listener
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768); // Increased breakpoint for better mobile experience
    
    // Set initial value
    checkMobile();
    
    // Add event listener for resize
    window.addEventListener('resize', checkMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Custom styles for mobile optimization
  const containerStyle = {
    background: 'linear-gradient(135deg, #f7f7ff 60%, #e0e7ff 100%)',
    padding: isMobile ? '20px 12px' : '28px',
    borderRadius: isMobile ? '16px' : '16px',
    margin: isMobile ? '8px auto' : '20px auto',
    boxShadow: '0 4px 16px rgba(80,80,160,0.07)',
    maxWidth: isMobile ? '100%' : '440px',
    width: isMobile ? 'calc(100% - 24px)' : 'auto',
    fontFamily: 'Inter, Arial, sans-serif',
    border: '1px solid #e0e7ff',
    fontSize: isMobile ? '16px' : '16px',
    overflowX: 'hidden',
    direction: 'rtl',
    transition: 'all 0.3s ease-in-out'
  };

  const buttonStyle = {
    padding: isMobile ? '16px 32px' : '14px 28px',
    fontSize: isMobile ? '18px' : '18px',
    margin: isMobile ? '12px 0' : '12px 0',
    minWidth: isMobile ? '140px' : '160px',
    borderRadius: '12px',
    fontWeight: '600',
    transition: 'all 0.2s ease'
  };

  const inputStyle = {
    padding: isMobile ? '14px 20px' : '14px 20px',
    fontSize: isMobile ? '18px' : '18px',
    margin: isMobile ? '12px 0' : '12px 0',
    borderRadius: '12px',
    border: '2px solid #e0e7ff',
    transition: 'all 0.2s ease'
  };
  
  // Listen for window resize to update mobile state
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth <= 768;
      document.querySelectorAll('.wallet-button').forEach(button => {
        button.style.padding = isMobile ? '4% 8%' : '3% 6%';
        button.style.fontSize = isMobile ? '4vw' : '2.5vw';
      });
      setActiveTab(activeTab);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeTab]);
  
  return (
    <div style={containerStyle}>
      <h3 style={{marginBottom: isMobile ? 12 : 18, color: '#3b3b6d', fontWeight: 700, letterSpacing: 1, fontSize: isMobile ? '18px' : '20px', textAlign: 'center'}}>חיבור ארנק Pi</h3>
      <div style={{display:'flex', justifyContent:'center', marginBottom: isMobile ? 16 : 18, flexWrap: 'wrap', gap: isMobile ? '10px' : '0'}}>
        <button onClick={()=>handleTabChange('wallet')} style={{
          padding: isMobile ? '10px 16px' : '8px 24px',
          background: activeTab==='wallet' ? '#5c6ac4' : '#e0e7ff',
          color: activeTab==='wallet' ? '#fff' : '#3b3b6d',
          border: 'none',
          borderRadius: isMobile ? '6px' : '8px 0 0 8px',
          fontWeight: 600,
          fontSize: isMobile ? 13 : 15,
          cursor: 'pointer',
          outline: 'none',
          flex: isMobile ? '1' : 'initial',
          minWidth: isMobile ? '0' : 'auto',
          touchAction: 'manipulation'
        }}>ארנק</button>
        <button onClick={()=>handleTabChange('history')} style={{
          padding: isMobile ? '6px 16px' : '8px 24px',
          background: activeTab==='history' ? '#5c6ac4' : '#e0e7ff',
          color: activeTab==='history' ? '#fff' : '#3b3b6d',
          border: 'none',
          borderRadius: isMobile ? '6px' : '0 8px 8px 0',
          fontWeight: 600,
          fontSize: isMobile ? 13 : 15,
          cursor: 'pointer',
          outline: 'none',
          flex: isMobile ? '1' : 'initial',
          minWidth: isMobile ? '0' : 'auto',
          touchAction: 'manipulation'
        }}>עסקאות</button>
        <button onClick={()=>handleTabChange('profile')} style={{
          padding: isMobile ? '6px 16px' : '8px 24px',
          background: activeTab==='profile' ? '#5c6ac4' : '#e0e7ff',
          color: activeTab==='profile' ? '#fff' : '#3b3b6d',
          border: 'none',
          borderRadius: isMobile ? '6px' : '0 8px 8px 0',
          fontWeight: 600,
          fontSize: isMobile ? 13 : 15,
          cursor: 'pointer',
          outline: 'none',
          marginLeft: isMobile ? 0 : 8,
          flex: isMobile ? '1' : 'initial',
          minWidth: isMobile ? '0' : 'auto',
          touchAction: 'manipulation'
        }}>פרופיל</button>
        <button onClick={() => setShowCommandPanel(!showCommandPanel)} style={{
          padding: isMobile ? '6px 16px' : '8px 24px',
          background: showCommandPanel ? '#5c6ac4' : '#e0e7ff',
          color: showCommandPanel ? '#fff' : '#3b3b6d',
          border: 'none',
          borderRadius: isMobile ? '6px' : 8,
          fontWeight: 600,
          fontSize: isMobile ? 13 : 15,
          cursor: 'pointer',
          outline: 'none',
          marginLeft: isMobile ? 0 : 8,
          marginTop: isMobile ? 8 : 0,
          width: isMobile ? '100%' : 'auto',
          touchAction: 'manipulation'
        }}>פקודות</button>
      </div>
      {notification && <div style={{ background:'#e0e7ff', color:'#3b3b6d', padding:8, borderRadius:6, marginBottom:10, textAlign:'center', fontWeight:500, whiteSpace: 'pre-line', fontSize: isMobile ? '13px' : '14px' }}>{notification}</div>}
      
      {showCommandPanel && (
      <div style={{padding: '12px', margin: '8px 0', borderRadius: '12px', backgroundColor: '#f8f9fa'}}>
        <div style={{marginBottom: 16, border: '1px solid #e0e7ff', borderRadius: 8, padding: isMobile ? 16 : 16, direction: 'rtl', width: isMobile ? '100%' : 'auto', fontSize: isMobile ? '14px' : '16px'}}>
          <h4 style={{margin: '0 0 12px 0', color: '#3b3b6d', fontSize: isMobile ? '16px' : '18px'}}>פאנל פקודות</h4>
          
          <form onSubmit={handleCommandSubmit} style={{display: 'flex', marginBottom: 12, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '8px' : '0'}}>
            <input 
              type="text" 
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              placeholder="הקלד /help לרשימת הפקודות"
              style={{flex: 1, padding: isMobile ? '12px 16px' : '8px 12px', borderRadius: isMobile ? '6px' : '6px 0 0 6px', border: '1px solid #e0e7ff', outline: 'none', fontSize: isMobile ? '16px' : '16px', minHeight: isMobile ? '48px' : 'auto'}}
            />
            <button 
              type="submit"
              style={{
                padding: '8px 16px',
                background: '#5c6ac4',
                color: '#fff',
                border: 'none',
                borderRadius: isMobile ? '6px' : '0 6px 6px 0',
                cursor: 'pointer',
                width: isMobile ? '100%' : 'auto'
              }}
            >
              שלח
            </button>
          </form>
          
          {/* Command status messages */}
          {commandError && (
            <div style={{marginBottom: 12, padding: 8, background: '#ffe6e6', color: '#e53e3e', borderRadius: 6, fontSize: isMobile ? 13 : 14}}>
              ❌ {commandError}
            </div>
          )}
          
          {commandSuccess && (
            <div style={{marginBottom: 12, padding: 8, background: '#e6ffe6', color: '#38a169', borderRadius: 6, fontSize: isMobile ? 13 : 14}}>
              ✅ {commandSuccess}
            </div>
          )}
          
          {/* Quick command buttons */}
          <div style={{display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12, justifyContent: isMobile ? 'space-between' : 'flex-start'}}>
            <button 
              onClick={() => parseCommand('/help')}
              style={{
                padding: isMobile ? '6px 10px' : '4px 8px',
                background: '#e0e7ff',
                color: '#3b3b6d',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: isMobile ? 13 : 12,
                touchAction: 'manipulation'
              }}
            >
              עזרה
            </button>
            <button 
              onClick={() => parseCommand('/list')}
              style={{
                padding: isMobile ? '6px 10px' : '4px 8px',
                background: '#e0e7ff',
                color: '#3b3b6d',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: isMobile ? 13 : 12,
                touchAction: 'manipulation'
              }}
            >
              רשימת הצ�����
            </button>
            {piUser && (
              <button 
                onClick={() => {
                  const type = prompt('Enter proposal type (feature, bugfix, policy):', 'feature');
                  if (!type) return;
                  const desc = prompt('Enter proposal description:');
                  if (!desc) return;
                  parseCommand(`/propose ${type} ${desc}`);
                }}
                style={{
                  padding: '4px 8px',
                  background: '#5c6ac4',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 12
                }}
              >
                New Proposal
              </button>
            )}
            <button 
              onClick={() => parseCommand('/clear')}
              style={{
                padding: '4px 8px',
                background: '#e0e7ff',
                color: '#3b3b6d',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 12
              }}
            >
              Clear History
            </button>
          </div>
          
          {commandHistory.length > 0 && (
            <div style={{marginBottom: 16}}>
              <h5 style={{margin: '0 0 8px 0', color: '#3b3b6d'}}>Command History</h5>
              <div style={{maxHeight: 100, overflowY: 'auto', background: '#f7f7ff', padding: 8, borderRadius: 6}}>
                {commandHistory.map((cmd, i) => (
                  <div key={i} style={{fontSize: 14, marginBottom: 4}}>
                    <span style={{color: '#5c6ac4'}}>$</span> {cmd}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {proposedChanges.length > 0 && (
            <div>
              <h5 style={{margin: '0 0 8px 0', color: '#3b3b6d'}}>Governance Proposals</h5>
              <div style={{maxHeight: 300, overflowY: 'auto'}}>
                {proposedChanges.map((prop) => {
                  const yesVotes = prop.votes.filter(v => v.vote === 'yes').length;
                  const noVotes = prop.votes.filter(v => v.vote === 'no').length;
                  const isActive = prop.id === activeProposal;
                  const isPending = prop.status === 'pending';
                  const isExecuted = prop.status === 'executed';
                  const isRejected = prop.status === 'rejected';
                  
                  // Determine background color based on status
                  let bgColor = '#f7f7ff';
                  let borderColor = '#e0e7ff';
                  if (isActive) {
                    bgColor = '#e6ffe6';
                    borderColor = '#38a169';
                  } else if (isExecuted) {
                    bgColor = '#e6ffe6';
                    borderColor = '#38a169';
                  } else if (isRejected) {
                    bgColor = '#ffe6e6';
                    borderColor = '#e53e3e';
                  }
                  
                  return (
                    <div key={prop.id} style={{
                      padding: 12,
                      marginBottom: 12,
                      background: bgColor,
                      borderRadius: 6,
                      border: `1px solid ${borderColor}`
                    }}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4}}>
                        <div style={{fontWeight: 600}}>{prop.description}</div>
                        <div style={{
                          fontSize: 12,
                          padding: '2px 6px',
                          borderRadius: 12,
                          background: isExecuted ? '#38a169' : isRejected ? '#e53e3e' : '#f0b429',
                          color: '#fff'
                        }}>
                          {prop.status.charAt(0).toUpperCase() + prop.status.slice(1)}
                        </div>
                      </div>
                      
                      <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 4}}>
                        <div style={{fontSize: 13, color: '#666'}}>
                          ID: <span style={{fontFamily: 'monospace'}}>{prop.id}</span>
                        </div>
                        <div style={{fontSize: 13, color: '#666', fontWeight: 500, textTransform: 'capitalize'}}>
                          Type: {prop.type}
                        </div>
                      </div>
                      
                      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8}}>
                        <div>
                          <span style={{color: '#38a169', marginRight: 8, fontWeight: 500}}>Yes: {yesVotes}</span>
                          <span style={{color: '#e53e3e', fontWeight: 500}}>No: {noVotes}</span>
                          <span style={{color: '#666', marginLeft: 8, fontSize: 12}}>
                            (Need {votingThreshold} votes to execute)
                          </span>
                        </div>
                      </div>
                      
                      {/* Voting buttons only shown for pending proposals */}
                      {isPending && piUser && (
                        <div style={{display: 'flex', gap: 8, marginBottom: 8}}>
                          <button 
                            onClick={() => parseCommand(`/vote ${prop.id} yes`)}
                            style={{
                              padding: '4px 12px',
                              background: '#38a169',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 4,
                              cursor: 'pointer',
                              fontSize: 12,
                              flex: 1
                            }}
                          >
                            Vote Yes
                          </button>
                          <button 
                            onClick={() => parseCommand(`/vote ${prop.id} no`)}
                            style={{
                              padding: '4px 12px',
                              background: '#e53e3e',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 4,
                              cursor: 'pointer',
                              fontSize: 12,
                              flex: 1
                            }}
                          >
                            Vote No
                          </button>
                        </div>
                      )}
                      
                      {/* Action buttons */}
                      <div style={{display: 'flex', gap: 8}}>
                        <button 
                          onClick={() => parseCommand(`/status ${prop.id}`)}
                          style={{
                            padding: '4px 12px',
                            background: '#e0e7ff',
                            color: '#3b3b6d',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: 12,
                            flex: 1
                          }}
                        >
                          View Details
                        </button>
                        
                        {isPending && yesVotes >= votingThreshold && yesVotes > noVotes && (
                          <button 
                            onClick={() => parseCommand(`/execute ${prop.id}`)}
                            style={{
                              padding: '4px 12px',
                              background: '#5c6ac4',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 4,
                              cursor: 'pointer',
                              fontSize: 12,
                              flex: 1
                            }}
                          >
                            Execute
                          </button>
                        )}
                        
                        {isPending && (
                          <button 
                            onClick={() => parseCommand(`/reject ${prop.id}`)}
                            style={{
                              padding: '4px 12px',
                              background: '#b4b4d8',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 4,
                              cursor: 'pointer',
                              fontSize: 12,
                              flex: 1
                            }}
                          >
                            Reject
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
      {activeTab === 'wallet' && (
        piUser ? (
          <div style={{textAlign:'center', direction: 'rtl'}}>
            <div style={{
              marginBottom: isMobile ? 20 : 16, 
              background: 'linear-gradient(135deg, #f7f7ff 0%, #e0e7ff 100%)', 
              border: '1px solid #e0e7ff', 
              borderRadius: 12, 
              padding: isMobile ? 20 : 16,
              boxShadow: '0 4px 12px rgba(80,80,160,0.05)'
            }}>
              <div style={{fontWeight:700, marginBottom: isMobile ? 12 : 8, fontSize: isMobile ? 16 : 'inherit'}}>פרטי ארנק</div>
              <div style={{marginBottom: 12, fontSize: isMobile ? '15px' : '16px'}}>מחובר כ: <b>{piUser.username}</b></div>
              <div style={{marginBottom: 12, fontSize: isMobile ? '15px' : '16px', wordBreak: 'break-all', padding: '0 10px'}}>כתובת ארנק: <b>{piUser.wallet?.address || 'לא זמין'}</b></div>
              <div style={{marginBottom: 16, fontSize: isMobile ? '18px' : '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'}}>
                יתרה: <b style={{fontSize: isMobile ? '22px' : '20px', color: '#5c6ac4'}}>{balance !== null ? balance.toFixed(4) : 'טוען...'} Pi</b>
                <button 
                  onClick={handleRefreshBalance} 
                  style={{
                    padding: isMobile ? '8px 12px' : '4px 10px', 
                    fontSize: isMobile ? 15 : 13, 
                    border: 'none', 
                    borderRadius: 8, 
                    background: '#e0e7ff', 
                    color: '#5c6ac4', 
                    cursor: 'pointer', 
                    touchAction: 'manipulation',
                    fontWeight: 600,
                    boxShadow: '0 2px 4px rgba(80,80,160,0.1)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  רענן יתרה ↻
                </button>
              </div>
            </div>
            <button
              style={{
                marginTop: isMobile ? 16 : 8,
                padding: isMobile ? '14px 24px' : '10px 22px',
                background: paymentLoading ? '#b4b4d8' : '#5c6ac4',
                width: isMobile ? '100%' : 'auto',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontWeight: 600,
                fontSize: isMobile ? 17 : 16,
                cursor: paymentLoading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(80,80,160,0.15)',
                touchAction: 'manipulation',
                transition: 'all 0.2s ease',
                height: isMobile ? '50px' : 'auto',
                maxWidth: isMobile ? '100%' : '280px'
              }}
              onClick={handlePayment}
              disabled={paymentLoading}
            >
              {paymentLoading ? 'מעבד...' : 'שלח תשלום לדוגמה (0.01 Pi)'}
            </button>
          </div>
        ) : (
          <button
            style={{
              padding: isMobile ? '12px 20px' : '10px 22px',
              background: loading ? '#b4b4d8' : '#5c6ac4',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: isMobile ? 15 : 16,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 8px rgba(80,80,160,0.07)',
              width: isMobile ? '100%' : 'auto',
              touchAction: 'manipulation'
            }}
            onClick={handleConnect}
            disabled={loading}
          >
            {loading ? 'מתחבר...' : 'התחבר לארנק Pi'}
          </button>
        )
      )}
      {activeTab === 'history' && (
        <div style={{marginTop:8, direction: 'rtl'}}>
          <div style={{marginBottom: isMobile ? 16 : 12}}>
            <div style={{
              display: 'grid', 
              gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr',
              gap: isMobile ? 10 : 8,
              marginBottom: isMobile ? 10 : 8
            }}>
              <select 
                value={selectedCurrency} 
                onChange={handleCurrencyChange} 
                style={{
                  padding: isMobile ? '10px 12px' : '6px 10px', 
                  borderRadius: 8, 
                  width: '100%', 
                  fontSize: isMobile ? '14px' : 'inherit',
                  border: '1px solid #e0e7ff',
                  backgroundColor: '#f7f7ff',
                  appearance: 'none',
                  backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23131313%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.7rem top 50%',
                  backgroundSize: '0.65rem auto',
                  paddingRight: '1.8rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  gridColumn: isMobile ? 'span 2' : 'auto'
                }}
              >
                <option value="All">כל המטבעות</option>
                {currencies.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select 
                value={filterStatus} 
                onChange={handleStatusFilter} 
                style={{
                  padding: isMobile ? '10px 12px' : '6px 10px', 
                  borderRadius: 8, 
                  width: '100%', 
                  fontSize: isMobile ? '14px' : 'inherit',
                  border: '1px solid #e0e7ff',
                  backgroundColor: '#f7f7ff',
                  appearance: 'none',
                  backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23131313%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.7rem top 50%',
                  backgroundSize: '0.65rem auto',
                  paddingRight: '1.8rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  gridColumn: isMobile ? 'span 1' : 'auto'
                }}
              >
                <option value="All">כל הסטטוסים</option>
                <option value="Completed">הושלם</option>
                <option value="Pending">ממתין</option>
                <option value="Cancelled">בוטל</option>
              </select>
              <select 
                value={sortField} 
                onChange={handleSortField} 
                style={{
                  padding: isMobile ? '10px 12px' : '6px 10px', 
                  borderRadius: 8, 
                  width: '100%', 
                  fontSize: isMobile ? '14px' : 'inherit',
                  border: '1px solid #e0e7ff',
                  backgroundColor: '#f7f7ff',
                  appearance: 'none',
                  backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23131313%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.7rem top 50%',
                  backgroundSize: '0.65rem auto',
                  paddingRight: '1.8rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  gridColumn: isMobile ? 'span 1' : 'auto'
                }}
              >
                <option value="date">מיון לפי תאריך</option>
                <option value="amount">מיון לפי סכום</option>
              </select>
              <select 
                value={sortOrder} 
                onChange={handleSortOrder} 
                style={{
                  padding: isMobile ? '10px 12px' : '6px 10px', 
                  borderRadius: 8, 
                  width: '100%', 
                  fontSize: isMobile ? '14px' : 'inherit',
                  border: '1px solid #e0e7ff',
                  backgroundColor: '#f7f7ff',
                  appearance: 'none',
                  backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23131313%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.7rem top 50%',
                  backgroundSize: '0.65rem auto',
                  paddingRight: '1.8rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  gridColumn: isMobile ? 'span 1' : 'auto'
                }}
              >
                <option value="desc">יורד</option>
                <option value="asc">עולה</option>
              </select>
            </div>
          </div>
          {isMobile ? (
            // Enhanced mobile-friendly card view for transactions
            <div style={{width:'100%'}}>
              {filteredSortedTransactions.length === 0 ? (
                <div style={{textAlign:'center', padding:16, color:'#b4b4d8', background:'#f7f7ff', borderRadius:8, fontSize: '15px'}}>אין עסקאות עדיין.</div>
              ) : (
                filteredSortedTransactions.map(tx => (
                  <div key={tx.id} 
                    style={{
                      background: tx.status==='Completed' ? '#e6ffe6' : tx.status==='Pending' ? '#fffbe6' : '#ffe6e6', 
                      cursor:'pointer',
                      padding: '16px',
                      borderRadius: '10px',
                      marginBottom: '14px',
                      boxShadow: '0 3px 6px rgba(0,0,0,0.08)',
                      touchAction: 'manipulation',
                      minHeight: '80px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      border: '1px solid rgba(0,0,0,0.03)',
                      position: 'relative',
                      overflow: 'hidden'
                    }} 
                    onClick={()=>handleTxClick(tx)}
                  >
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center'}}>
                      <div style={{fontWeight: 'bold', fontSize: '17px'}}>{tx.amount} {tx.currency}</div>
                      <div style={{fontSize: '14px', opacity: 0.8}}>{tx.date}</div>
                    </div>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <div style={{fontSize: '14px', maxWidth: '65%', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap'}}>{tx.memo}</div>
                      <div style={{
                        fontSize: '13px', 
                        padding: '5px 10px', 
                        borderRadius: '6px',
                        background: tx.status==='Completed' ? '#38a169' : tx.status==='Pending' ? '#f0b429' : '#e53e3e',
                        color: '#fff',
                        fontWeight: 600,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                      }}>{tx.status}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            // Desktop table view
            <table style={{width:'100%', borderCollapse:'collapse', fontSize:15}}>
              <thead>
                <tr style={{background:'#e0e7ff', color:'#3b3b6d'}}>
                  <th style={{padding:'6px 4px', borderRadius:'6px 0 0 0'}}>תאריך</th>
                  <th style={{padding:'6px 4px'}}>סכום</th>
                  <th style={{padding:'6px 4px'}}>מטבע</th>
                  <th style={{padding:'6px 4px'}}>סטטוס</th>
                  <th style={{padding:'6px 4px', borderRadius:'0 6px 0 0'}}>הערה</th>
                  <th style={{padding:'6px 4px'}}>פרטים</th>
                </tr>
              </thead>
              <tbody>
                {filteredSortedTransactions.length === 0 ? (
                  <tr><td colSpan={6} style={{textAlign:'center', padding:12, color:'#b4b4d8'}}>אין עסקאות עדיין.</td></tr>
                ) : (
                  filteredSortedTransactions.map(tx => (
                    <tr key={tx.id} style={{background: tx.status==='Completed' ? '#e6ffe6' : tx.status==='Pending' ? '#fffbe6' : '#ffe6e6', cursor:'pointer'}} onClick={()=>handleTxClick(tx)}>
                      <td style={{padding:'6px 4px'}}>{tx.date}</td>
                      <td style={{padding:'6px 4px'}}>{tx.amount}</td>
                      <td style={{padding:'6px 4px'}}>{tx.currency}</td>
                      <td style={{padding:'6px 4px'}}>{tx.status}</td>
                      <td style={{padding:'6px 4px'}}>{tx.memo}</td>
                      <td style={{padding:'6px 4px'}}>{tx.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
          {selectedTx && (
            <div style={{
              marginTop: isMobile ? 20 : 16, 
              background: 'linear-gradient(135deg, #f7f7ff 0%, #e0e7ff 100%)',
              border: '1px solid #e0e7ff', 
              borderRadius: isMobile ? 12 : 8, 
              padding: isMobile ? 16 : 16, 
              direction: 'rtl',
              boxShadow: '0 4px 12px rgba(80,80,160,0.05)'
            }}>
              <div style={{fontWeight:700, marginBottom: isMobile ? 12 : 8, fontSize: isMobile ? '18px' : '18px', color: '#3b3b6d'}}>פרטי עסקה</div>
              
              <div style={{display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '10px' : '8px', marginBottom: '16px'}}>
                <div style={{fontSize: isMobile ? '15px' : '16px', padding: '8px', background: 'rgba(255,255,255,0.5)', borderRadius: '8px'}}>
                  <b style={{color: '#5c6ac4'}}>מזהה:</b> <span style={{wordBreak: 'break-all'}}>{selectedTx.id}</span>
                </div>
                <div style={{fontSize: isMobile ? '15px' : '16px', padding: '8px', background: 'rgba(255,255,255,0.5)', borderRadius: '8px'}}>
                  <b style={{color: '#5c6ac4'}}>תאריך:</b> {selectedTx.date}
                </div>
                <div style={{fontSize: isMobile ? '15px' : '16px', padding: '8px', background: 'rgba(255,255,255,0.5)', borderRadius: '8px'}}>
                  <b style={{color: '#5c6ac4'}}>סכום:</b> {selectedTx.amount} {selectedTx.currency}
                </div>
                <div style={{fontSize: isMobile ? '15px' : '16px', padding: '8px', background: 'rgba(255,255,255,0.5)', borderRadius: '8px'}}>
                  <b style={{color: '#5c6ac4'}}>סטטוס:</b> 
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '14px',
                    marginRight: '4px',
                    background: selectedTx.status === 'Completed' ? '#38a169' : selectedTx.status === 'Pending' ? '#f0b429' : '#e53e3e',
                    color: '#fff'
                  }}>{selectedTx.status}</span>
                </div>
                <div style={{fontSize: isMobile ? '15px' : '16px', padding: '8px', background: 'rgba(255,255,255,0.5)', borderRadius: '8px', gridColumn: isMobile ? 'span 1' : 'span 2'}}>
                  <b style={{color: '#5c6ac4'}}>הערה:</b> {selectedTx.memo}
                </div>
                <div style={{fontSize: isMobile ? '15px' : '16px', padding: '8px', background: 'rgba(255,255,255,0.5)', borderRadius: '8px', gridColumn: isMobile ? 'span 1' : 'span 2'}}>
                  <b style={{color: '#5c6ac4'}}>פרטים:</b> {selectedTx.details}
                </div>
              </div>
              
              <button 
                onClick={handleCloseTx} 
                style={{
                  marginTop: isMobile ? 12 : 10, 
                  padding: isMobile ? '12px 24px' : '8px 20px', 
                  border: 'none', 
                  borderRadius: isMobile ? 10 : 8, 
                  background: '#5c6ac4', 
                  color: '#fff', 
                  cursor: 'pointer',
                  width: isMobile ? '100%' : 'auto',
                  fontSize: isMobile ? '16px' : '16px',
                  fontWeight: 600,
                  touchAction: 'manipulation',
                  boxShadow: '0 2px 8px rgba(80,80,160,0.15)',
                  transition: 'all 0.2s ease'
                }}
              >
                סגור
              </button>
            </div>
          )}
        )}
        {activeTab === 'profile' && (
          <div style={{marginTop:8, textAlign:'center', direction: 'rtl'}}>
            <div style={{fontWeight:700, fontSize: isMobile ? 16 : 18, marginBottom:8}}>פרופיל משתמש</div>
            {piUser ? (
              <>
                <div style={{fontSize: isMobile ? '14px' : '16px', marginBottom: '4px'}}><b>שם משתמש:</b> {piUser.username}</div>
                <div style={{fontSize: isMobile ? '14px' : '16px', marginBottom: '4px'}}><b>כתובת ארנק:</b> {piUser.wallet?.address || 'לא זמין'}</div>
                <div style={{fontSize: isMobile ? '14px' : '16px', marginBottom: '4px'}}><b>אימות KYC:</b> {piUser.kyc_verified ? 'כן' : 'לא'}</div>
              </>
            ) : (
              <div style={{color:'#b4b4d8', fontSize: isMobile ? '14px' : '16px'}}>התחבר לארנק Pi כדי לצפות בפרופיל.</div>
            )}
          </div>
        )}
      {error && <div style={{ color: '#e53e3e', marginTop: 14, fontWeight: 500, textAlign:'center' }}>{error}</div>}
      {paymentStatus && <div style={{ color: paymentStatus.startsWith('Payment completed') ? '#38a169' : '#3b3b6d', marginTop: 14, fontWeight: 500, textAlign:'center' }}>{paymentStatus}</div>}
    </div>
  );
}
