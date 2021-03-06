import {
  ABIConverter,
  BYTECODEConverter,
  BancorRegistryMAIN,
  BNTToken,
  USDBToken
} from '../../../../../config'
import { Form } from "react-bootstrap"
import React, { Component } from 'react'

import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';

import UserInfo from '../../../../templates/UserInfo'

class StepTwo extends Component {
 state = {
   bancorConncectorAddress:null
 }

 componentDidMount () {
   let bancorConncectorAddress
   const connectorType = window.localStorage.getItem('connectorType')
   if(connectorType === "USDB" || connectorType === "BNT"){
     bancorConncectorAddress = connectorType === "USDB" ? USDBToken : BNTToken
   }else{
     bancorConncectorAddress = BNTToken
     alert('You have problem with connector type, we set BNT by default')
   }
   this.setState({ bancorConncectorAddress })
 }

 createConverter = async (tokenAddress) => {
  // Get name for smart token from input tokenAddress
  // write txs in local storage
  const web3 = this.props.MobXStorage.web3
  const accounts = this.props.MobXStorage.accounts
  const stHash = window.localStorage.getItem('txSmartToken')

  const stInfo = await web3.eth.getTransactionReceipt(stHash)
  if(stInfo !== null && stInfo !== "undefined"){
    const smartToken = stInfo.contractAddress
    window.localStorage.setItem('smartToken', smartToken)
    const contract =  new web3.eth.Contract(ABIConverter, null)

    console.log("smartToken address ", smartToken)
    console.log("PARAMS: ", smartToken, BancorRegistryMAIN, 50000, this.state.bancorConncectorAddress, 500000)

    const gasPrice = this.props.MobXStorage.GasPrice

    contract.deploy({
        data: BYTECODEConverter,
        arguments: [smartToken, BancorRegistryMAIN, 50000, this.state.bancorConncectorAddress, 500000]
    })
    .send({
      from: accounts[0],
      gas:7372732,
      gasPrice
    })
    .on('transactionHash', (hash) => {
     console.log("converter hash ", hash)
     window.localStorage.setItem('txConverter', hash)
     this.props.MobXStorage.setPending(true)
     window.localStorage.setItem('StepNext', "Three")
     window.localStorage.setItem('txLatest', hash)
     this.props.MobXStorage.txFinish()
    })
    .on('confirmation', (confirmationNumber, receipt) => {
      //this.props.MobXStorage.txFinish()
    })
  }
  else{
    alert("Smart token contract not deployed yet, please wait")
  }


 }
render() {
  return(
    <Card style={{backgroundColor:'rgba(255,255,255,0.1)'}}>
      <CardContent>
        <Typography variant="h4" gutterBottom component="h4">
          Step 2 of 3
        </Typography>
        <Typography variant="body1" className={'mb-2'} component="p">
        <strong>Create Converter</strong>
        </Typography>
        <Typography variant="body1" className={'mb-2'} component="p">
          This <UserInfo label="Bancor documentation" info={`Smart token address from previos step, Bancor registry contract address, Max Fee: 5000​0 (5%), Weight: 500,000 (50%)`}/> step will be done
        </Typography>
        <Typography className={'mt-2 mb-2'} component="div">
        <hr/>
        <Form style={{margin: '10px auto', maxWidth: '350px', width:'100%'}}>
          <Button variant="contained" color="primary" size="medium" onClick={() => this.createConverter()}>create converter</Button>
        </Form>
        </Typography>
      </CardContent>
    </Card>
  )
}
}

export default StepTwo
