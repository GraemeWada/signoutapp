import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { RefreshCw } from 'lucide-react'

// Expanded mock data for parts inventory
const initialParts = [
  { name: 'Screwdriver', sku: 'SD001', stock: 50 },
  { name: 'Hammer', sku: 'HM001', stock: 30 },
  { name: 'Wrench', sku: 'WR001', stock: 40 },
  { name: 'Pliers', sku: 'PL001', stock: 25 },
  { name: 'Drill', sku: 'DR001', stock: 20 },
  { name: 'Saw', sku: 'SW001', stock: 15 },
  { name: 'Measuring Tape', sku: 'MT001', stock: 35 },
  { name: 'Level', sku: 'LV001', stock: 22 },
  { name: 'Chisel', sku: 'CH001', stock: 18 },
  { name: 'Wire Stripper', sku: 'WS001', stock: 28 },
  { name: 'Utility Knife', sku: 'UK001', stock: 45 },
  { name: 'Allen Wrench Set', sku: 'AW001', stock: 33 },
  { name: 'Screwdriver Set', sku: 'SS001', stock: 27 },
  { name: 'Socket Set', sku: 'SK001', stock: 19 },
  { name: 'Multimeter', sku: 'MM001', stock: 12 },
]

type Part = {
  name: string
  sku: string
  stock: number
}

type SignOutRequest = {
  name: string
  date: string
  teamNumber: string
  parts: { name: string; sku: string; quantity: number }[]
}

type TeamParts = {
  [teamNumber: string]: { name: string; sku: string; quantity: number }[]
}

export default function App() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [parts, setParts] = useState<Part[]>(initialParts)
  const [signOutQueue, setSignOutQueue] = useState<SignOutRequest[]>([])
  const [numTeams, setNumTeams] = useState(8)
  const [teamParts, setTeamParts] = useState<TeamParts>({})

  const handleSignOut = (request: SignOutRequest) => {
    setSignOutQueue([...signOutQueue, request])
  }

  const handleApproveRequest = (index: number) => {
    const request = signOutQueue[index]
    const updatedParts = parts.map(part => {
      const requestedPart = request.parts.find(p => p.sku === part.sku)
      if (requestedPart) {
        return { ...part, stock: part.stock - requestedPart.quantity }
      }
      return part
    })
    setParts(updatedParts)
    setSignOutQueue(signOutQueue.filter((_, i) => i !== index))

    // Update team parts
    setTeamParts(prevTeamParts => {
      const updatedTeamParts = { ...prevTeamParts }
      if (!updatedTeamParts[request.teamNumber]) {
        updatedTeamParts[request.teamNumber] = []
      }
      request.parts.forEach(part => {
        const existingPart = updatedTeamParts[request.teamNumber].find(p => p.sku === part.sku)
        if (existingPart) {
          existingPart.quantity += part.quantity
        } else {
          updatedTeamParts[request.teamNumber].push({ ...part })
        }
      })
      return updatedTeamParts
    })
  }

  const handleDeleteRequest = (index: number) => {
    setSignOutQueue(signOutQueue.filter((_, i) => i !== index))
  }

  const handleDownloadRequestCSV = (request: SignOutRequest) => {
    let csvContent = "Date,Name,Team Number,Part Name,SKU Number,Number Ordered\n"
    request.parts.forEach(part => {
      csvContent += `${request.date},${request.name},${request.teamNumber},${part.name},${part.sku},${part.quantity}\n`
    })
    downloadCSV(csvContent, `parts_request_${request.name}_${request.date}.csv`)
  }

  const handleDownloadStockCSV = () => {
    let csvContent = "Part Name,SKU Number,Number in Stock\n"
    parts.forEach(part => {
      csvContent += `${part.name},${part.sku},${part.stock}\n`
    })
    downloadCSV(csvContent, "current_stock.csv")
  }

  const handleDownloadTeamPartsCSV = (teamNumber: string) => {
    const teamPartsData = teamParts[teamNumber] || []
    let csvContent = "Part Name,SKU Number,Quantity Signed Out\n"
    teamPartsData.forEach(part => {
      csvContent += `${part.name},${part.sku},${part.quantity}\n`
    })
    downloadCSV(csvContent, `team_${teamNumber}_parts.csv`)
  }

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a")
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", filename)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleEditStock = (updatedPart: Part) => {
    setParts(parts.map(part => part.sku === updatedPart.sku ? updatedPart : part))
  }

  const handleAddNewPart = (newPart: Part) => {
    setParts([...parts, newPart])
  }

  const handleRemovePart = (skuToRemove: string) => {
    setParts(parts.filter(part => part.sku !== skuToRemove))
  }

  const checkStockAvailability = (request: SignOutRequest): boolean => {
    return request.parts.every(requestedPart => {
      const stockPart = parts.find(p => p.sku === requestedPart.sku)
      return stockPart && stockPart.stock >= requestedPart.quantity
    })
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Parts Sign Out App</h1>
      {isAdmin ? (
        <AdminDashboard
          signOutQueue={signOutQueue}
          onApprove={handleApproveRequest}
          onDelete={handleDeleteRequest}
          onDownloadRequestCSV={handleDownloadRequestCSV}
          onDownloadStockCSV={handleDownloadStockCSV}
          onLogout={() => setIsAdmin(false)}
          numTeams={numTeams}
          setNumTeams={setNumTeams}
          parts={parts}
          onEditStock={handleEditStock}
          onAddNewPart={handleAddNewPart}
          onRemovePart={handleRemovePart}
          checkStockAvailability={checkStockAvailability}
          teamParts={teamParts}
          onDownloadTeamPartsCSV={handleDownloadTeamPartsCSV}
        />
      ) : (
        <>
          <SignOutForm parts={parts} onSignOut={handleSignOut} numTeams={numTeams} />
          <AdminLogin onLogin={() => setIsAdmin(true)} />
        </>
      )}
    </div>
  )
}

function PartsList({ parts, onSelectPart }: { parts: Part[], onSelectPart: (part: Part, quantity: number) => void }) {
  const [quantities, setQuantities] = useState<{[sku: string]: number}>(
    parts.reduce((acc, part) => ({ ...acc, [part.sku]: 0 }), {})
  )

  const handleQuantityChange = (part: Part, quantity: number) => {
    setQuantities(prev => ({ ...prev, [part.sku]: quantity }))
    onSelectPart(part, quantity)
  }

  return (
    <ScrollArea className="h-[300px] w-full border rounded-md p-4">
      {parts.map(part => (
        <div key={part.sku} className="flex items-center space-x-2 mb-2">
          <span className="flex-grow">{part.name} (SKU: {part.sku}, Stock: {part.stock})</span>
          <Input
            type="number"
            min="0"
            max={part.stock}
            value={quantities[part.sku]}
            onChange={e => handleQuantityChange(part, parseInt(e.target.value) || 0)}
            className="w-20"
          />
        </div>
      ))}
    </ScrollArea>
  )
}

function SignOutForm({ parts, onSignOut, numTeams }: { parts: Part[], onSignOut: (request: SignOutRequest) => void, numTeams: number }) {
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [teamNumber, setTeamNumber] = useState('')
  const [selectedParts, setSelectedParts] = useState<{ name: string; sku: string; quantity: number }[]>([])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSignOut({ name, date, teamNumber, parts: selectedParts })
    setName('')
    setDate('')
    setTeamNumber('')
    setSelectedParts([])
    // Reset all input fields to 0
    const inputs = e.target.querySelectorAll('input[type="number"]') as NodeListOf<HTMLInputElement>
    inputs.forEach(input => {
      input.value = '0'
    })
  }

  const handlePartSelection = (part: Part, quantity: number) => {
    const actualQuantity = isNaN(quantity) ? 0 : quantity;
    setSelectedParts(prev => {
      const existing = prev.find(p => p.sku === part.sku)
      if (existing) {
        return prev.map(p => p.sku === part.sku ? { ...p, quantity: actualQuantity } : p)
      } else {
        return [...prev, { name: part.name, sku: part.sku, quantity: actualQuantity }]
      }
    })
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Sign Out Parts</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="teamNumber">Team Number</Label>
            <Select value={teamNumber} onValueChange={setTeamNumber}>
              <SelectTrigger>
                <SelectValue placeholder="Select team number" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: numTeams }, (_, i) => i + 1).map(num => (
                  <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Parts</h3>
            <PartsList parts={parts} onSelectPart={handlePartSelection} />
          </div>
          <Button type="submit">Submit Request</Button>
        </form>
      </CardContent>
    </Card>
  )
}

function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (username === 'admin' && password === 'password') {
      onLogin()
    } else {
      alert('Invalid credentials')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin Login</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="username">Username</Label>
            <Input id="username" value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <Button type="submit">Login</Button>
        </form>
      </CardContent>
    </Card>
  )
}

function AdminDashboard({ 
  signOutQueue, 
  onApprove, 
  onDelete, 
  onDownloadRequestCSV,
  onDownloadStockCSV, 
  onLogout, 
  numTeams, 
  setNumTeams,
  parts,
  onEditStock,
  onAddNewPart,
  onRemovePart,
  checkStockAvailability,
  teamParts,
  onDownloadTeamPartsCSV
}: { 
  signOutQueue: SignOutRequest[], 
  onApprove: (index: number) => void, 
  onDelete: (index: number) => void,
  onDownloadRequestCSV: (request: SignOutRequest) => void,
  onDownloadStockCSV: () => void,
  
  onLogout: () => void,
  numTeams: number,
  setNumTeams: (num: number) => void,
  parts: Part[],
  onEditStock: (part: Part) => void,
  onAddNewPart: (part: Part) => void,
  onRemovePart: (sku: string) => void,
  checkStockAvailability: (request: SignOutRequest) => boolean,
  teamParts: TeamParts,
  onDownloadTeamPartsCSV: (teamNumber: string) => void
}) {
  const [refreshKey, setRefreshKey] = useState(0)

  const handleRefresh = () => {
    setRefreshKey(prevKey => prevKey + 1)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin Dashboard</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Label htmlFor="numTeams">Number of Teams</Label>
          <Input
            id="numTeams"
            type="number"
            min="1"
            value={numTeams}
            onChange={e => setNumTeams(parseInt(e.target.value))}
            className="w-20"
          />
        </div>
        <h2 className="text-xl font-semibold mb-4">Sign Out Requests</h2>
        <ScrollArea className="h-[400px] w-full border rounded-md p-4 mb-4">
          {signOutQueue.map((request, index) => (
            <div key={index} className="mb-4 p-4 border rounded">
              <p><strong>Name:</strong> {request.name}</p>
              <p><strong>Date:</strong> {request.date}</p>
              <p><strong>Team Number:</strong> {request.teamNumber}</p>
              <h3 className="font-semibold mt-2">Requested Parts:</h3>
              <ul>
                {request.parts.map(part => (
                  <li key={part.sku}>{part.name} (SKU: {part.sku}) - Quantity: {part.quantity}</li>
                ))}
              </ul>
              <div className="mt-2 space-x-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button 
                          onClick={() => onApprove(index)} 
                          disabled={!checkStockAvailability(request)}
                        >
                          Approve
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      {checkStockAvailability(request) 
                        ? 'Approve this request' 
                        : 'Not enough stock to fulfill this request'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Button onClick={() => onDelete(index)} variant="destructive">Delete</Button>
                <Button onClick={() => onDownloadRequestCSV(request)}>Download CSV</Button>
              </div>
            </div>
          ))}
        </ScrollArea>
        <div className="space-x-2 mb-4">
          <Button onClick={onDownloadStockCSV}>Download Current Stock CSV</Button>
          <Button onClick={onLogout} variant="outline">Logout</Button>
        </div>
        <h2 className="text-xl font-semibold mb-4">Manage Stock</h2>
        <div className="flex justify-between items-center mb-2">
          <span>Current Stock</span>
          <Button onClick={handleRefresh} size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
        <ScrollArea className="h-[300px] w-full border rounded-md p-4 mb-4">
          {parts.map(part => (
            <EditStockItem 
              key={`${part.sku}-${refreshKey}`}
              part={part} 
              onEdit={onEditStock} 
              onRemove={onRemovePart}
            />
          ))}
        </ScrollArea>
        <AddNewPart onAddNewPart={onAddNewPart} />
        <h2 className="text-xl font-semibold my-4">Team Parts Tracking</h2>
        <ScrollArea className="h-[300px] w-full border rounded-md p-4 mb-4">
          {Object.entries(teamParts).map(([teamNumber, parts]) => (
            <div key={teamNumber} className="mb-4 p-4 border rounded">
              <h3 className="font-semibold mb-2">Team {teamNumber}</h3>
              <ul>
                {parts.map(part => (
                  <li key={part.sku}>{part.name} (SKU: {part.sku}) - Quantity: {part.quantity}</li>
                ))}
              </ul>
              <Button onClick={() => onDownloadTeamPartsCSV(teamNumber)} className="mt-2">
                Download Team CSV
              </Button>
            </div>
          ))}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

function EditStockItem({ part, onEdit, onRemove }: { part: Part, onEdit: (part: Part) => void, onRemove: (sku: string) => void }) {
  const [stock, setStock] = useState(part.stock)

  const handleEdit = () => {
    onEdit({ ...part, stock })
  }

  return (
    <div className="flex items-center space-x-2 mb-2">
      <span className="flex-grow">{part.name} (SKU: {part.sku})</span>
      <Input
        type="number"
        min="0"
        value={stock}
        onChange={e => setStock(parseInt(e.target.value))}
        className="w-20"
      />
      <Button onClick={handleEdit}>Update</Button>
      <Button onClick={() => onRemove(part.sku)} variant="destructive">Remove</Button>
    </div>
  )
}

function AddNewPart({ onAddNewPart }: { onAddNewPart: (part: Part) => void }) {
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [stock, setStock] = useState(0)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onAddNewPart({ name, sku, stock })
    setName('')
    setSku('')
    setStock(0)
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Add New Part</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Part</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="partName">Part Name</Label>
            <Input id="partName" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="partSku">SKU Number</Label>
            <Input id="partSku" value={sku} onChange={e => setSku(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="partStock">Initial Stock</Label>
            <Input
              id="partStock"
              type="number"
              min="0"
              value={stock}
              onChange={e => setStock(parseInt(e.target.value))}
              required
            />
          </div>
          <Button type="submit">Add Part</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}