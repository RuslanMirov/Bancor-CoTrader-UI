// TODO DELETE this file AFTER TESTS
import React, { Component } from 'react'
import { hexToNumberString, fromWei, toWei } from 'web3-utils'
import { Alert } from "react-bootstrap"
import {
  ABISmartToken,
  EtherscanLink,
  ABIBancorNetwork,
  BancorNetwork,
} from '../../../../config'

import getDirectionData from '../../../../service/getDirectionData'
import getPath from '../../../../service/getPath'
import getWeb3ForRead from '../../../../service/getWeb3ForRead'

import Pending from '../../../templates/Spiners/Pending'
import Paper from '@material-ui/core/Paper'
import Typography from '@material-ui/core/Typography'
import Chip from '@material-ui/core/Chip'

class DirectionInfo extends Component {
  constructor(props, context) {
   super(props, context)
    this.state = {
      sendFrom:undefined,
      sendTo:undefined,
      userBalanceFrom:0,
      balanceOfTo:0,
      amountReturnFrom:0,
      oneToInUSD:0,
      amountReturnFromTo:0,
      totalTradeValue:0,
      oneFromInUSD:0,
      slippage:0,
      loadData:false,
      tokenInfoTo:[],
      tokenInfoFrom:[]
  }
  }

  componentDidUpdate(prevProps, prevState){
    // Update rate by onChange
    if(prevProps.from !== this.props.from || prevProps.to !== this.props.to || prevProps.directionAmount !== this.props.directionAmount || prevProps.amountReturn !== this.props.amountReturn){
      this.setTokensData()
    }
  }

  // get user balance
  getTokensBalance = async (sendFrom, sendTo, web3) => {
    let userBalanceFrom
    let token
    let tokenTo
    let balanceOfTo

    if(this.props.from !== "ETH"){
      token = new web3.eth.Contract(ABISmartToken, sendFrom)
      userBalanceFrom = await token.methods.balanceOf(this.props.accounts[0]).call()
      userBalanceFrom = fromWei(hexToNumberString(userBalanceFrom._hex))
    }else{
      userBalanceFrom = await web3.eth.getBalance((this.props.accounts[0]))
      userBalanceFrom = fromWei(String(parseFloat(userBalanceFrom).toFixed()))
    }

    if(this.props.to !== "ETH"){
      tokenTo = new web3.eth.Contract(ABISmartToken, sendTo)
      balanceOfTo = await tokenTo.methods.balanceOf(this.props.accounts[0]).call()
      balanceOfTo = fromWei(hexToNumberString(balanceOfTo._hex))
    }else{
      balanceOfTo = await web3.eth.getBalance((this.props.accounts[0]))
      balanceOfTo = fromWei(String(parseFloat(balanceOfTo).toFixed()))
    }

    return { userBalanceFrom, balanceOfTo }
  }

// return rate from Bancor network
// Note: work slowly when we use service/getRateByPath instead directly implement
getReturnByPath = async (path, amount, web3) => {
  const bancorNetwork = new web3.eth.Contract(ABIBancorNetwork, BancorNetwork)
  let amountReturn = await bancorNetwork.methods.getReturnByPath(
    path,
    toWei(String(parseFloat(amount).toFixed(6)))
  ).call()

  if(amountReturn){
    amountReturn = Number(fromWei(hexToNumberString(amountReturn[0]._hex)))
  }else{
    amountReturn = 0
  }

  return amountReturn
}

// return rate in DAI (USD) total trade value, slippage, ect
getRateInfo = async (objPropsFrom, objPropsTo, directionAmount, amountReturn, web3) => {
  const pathFrom = getPath(this.props.from, "DAI", this.props.bancorTokensStorageJson, objPropsFrom)
  const pathTo = getPath(this.props.to, "DAI", this.props.bancorTokensStorageJson, objPropsTo)
  const pathFromTo = getPath(this.props.from, this.props.to, this.props.bancorTokensStorageJson, objPropsFrom, objPropsTo)

  // get rate for from in DAI
  const amountReturnFrom = await this.getReturnByPath(pathFrom, directionAmount, web3)
  // get rate for from/to
  const amountReturnFromTo = await this.getReturnByPath(pathFromTo, directionAmount, web3)
  // get rate in DAI for from 1 token
  const oneFromInUSD = await this.getReturnByPath(pathFrom, 1, web3)
  // get rate in DAI for 1 to token
  const oneToInUSD = await this.getReturnByPath(pathTo, 1, web3)

  const totalTradeValue = await this.getReturnByPath(pathFrom, directionAmount, web3)

  const slippage = await this.calculateSlippage(pathFromTo, directionAmount, web3)

  return {
    amountReturnFrom,
    amountReturnFromTo,
    totalTradeValue,
    oneFromInUSD,
    oneToInUSD,
    slippage
   }
}


calculateSlippage = async (pathFromTo, directionAmount, web3) => {
  const tinyDiv = directionAmount < 0.001 ? 10 : 1000
  // formula
  // tinyTrade = useroneFromInUSDFromAmount  / tinyDiv
  const tinyTrade = Number(directionAmount) / tinyDiv
  // tinyTradeRate = tinyTrade / userOuputAmountFromTinyTrade
  const outputAmountFromTinyTrade = await this.getReturnByPath(pathFromTo, tinyTrade, web3)
  const tinyTradeRate = tinyTrade / outputAmountFromTinyTrade
  // realTradeRate = useroneFromInUSDFromAmount / userOuputAmountFromRealTrade
  const ouputAmountFromRealTrade = await this.getReturnByPath(pathFromTo, directionAmount, web3)
  const realTradeRate = Number(directionAmount) / ouputAmountFromRealTrade
  // slippage% = (1 - realTradeRate / tinyTradeRate) * 100
  let slippage = (1 - realTradeRate / tinyTradeRate) * 100
  slippage = Math.abs(parseFloat(slippage).toFixed(6))

  return slippage
}



// update states
setTokensData = async () => {
  if(this.props.to && this.props.from && this.props.from !== this.props.to && this.props.directionAmount > 0 && this.props.amountReturn > 0){
    this.setState({ loadData:true })
    const { objPropsFrom, objPropsTo, tokenInfoFrom, tokenInfoTo, sendFrom, sendTo } = getDirectionData(
      this.props.from,
      this.props.to,
      this.props.bancorTokensStorageJson,
      this.props.useERC20AsSelectFrom,
      this.props.useERC20AsSelectTo
    )
    const web3 = getWeb3ForRead(this.props.web3)

    const { userBalanceFrom, balanceOfTo } = this.props.accounts ? await this.getTokensBalance(sendFrom, sendTo, web3) : { userBalanceFrcom:0, balanceOfTo:0 }
    const {
      amountReturnFrom,
      amountReturnFromTo,
      totalTradeValue,
      oneFromInUSD,
      oneToInUSD,
      slippage
    } = await this.getRateInfo(objPropsFrom, objPropsTo, this.props.directionAmount, this.props.amountReturn, web3)

    this.setState({
      sendFrom,
      sendTo,
      userBalanceFrom,
      balanceOfTo,
      amountReturnFrom,
      amountReturnFromTo,
      totalTradeValue,
      oneFromInUSD,
      oneToInUSD,
      slippage,
      tokenInfoTo,
      tokenInfoFrom,
      loadData:false
     })
  }
}

  render(){
   return(
    <React.Fragment>
    {
      this.state.loadData
      ?
      (<Pending/>)
      :
      (null)
    }

    {
      this.state.sendTo && this.state.sendFrom && this.props.directionAmount > 0 && this.props.from !== this.props.to
      ?
      (
      <React.Fragment>
      {
        this.props.accounts && this.props.directionAmount > Number(this.state.userBalanceFrom)
        ?
        (
          <Alert variant="danger">You don't have enough {this.props.from}</Alert>
        )
        :
        (null)
      }

      <Paper style={{padding: '15px'}}>
      <Chip label="Additional info" style={{marginBottom: '15px'}} variant="outlined" color="primary"/>
        <Typography component="div">
          <small>Etherscan:
          <strong>{ <a className="text_blue" href={EtherscanLink + "token/" + this.state.sendTo} target="_blank" rel="noopener noreferrer"> {this.props.to}</a> }</strong>,
          <strong>{ <a className="text_blue" href={EtherscanLink + "token/" + this.state.sendFrom} target="_blank" rel="noopener noreferrer"> {this.props.from}</a> }</strong>
          </small>
        </Typography>

        {
        this.props.accounts
        ?
        (
          <React.Fragment>
          <Typography component="div">
          <small>Your balance of {this.props.from}: <strong className="text_blue">{parseFloat(this.state.userBalanceFrom).toFixed(6)}</strong></small>
          </Typography>
          <Typography component="div">
          <small>Your balance of {this.props.to}: <strong className="text_blue">{parseFloat(this.state.balanceOfTo).toFixed(6)}</strong></small>
          </Typography>
          </React.Fragment>
        )
        :
        (null)
      }

       <Typography component="div">
        <small>USD/{this.props.from}: <strong className="text_blue">${parseFloat(this.state.oneFromInUSD).toFixed(6)}</strong></small>
       </Typography>

       <Typography component="div">
        <small>Slippage: <strong className="text_blue">{this.state.slippage} %</strong></small>
       </Typography>

       <Typography component="div">
         <small>Trade value: <strong className="text_blue">${parseFloat(this.state.totalTradeValue).toFixed(6)}</strong></small>
       </Typography>

        <Typography component="div">
          <small>USD/{this.props.to} avg pay rate: <strong className="text_blue">${this.state.oneToInUSD}</strong></small>
        </Typography>

        <Typography component="div">
          <small>{this.props.to}/{this.props.from} avg pay rate: <strong className="text_blue">{parseFloat(this.state.amountReturnFromTo).toFixed(6)} {this.props.to}</strong></small>
        </Typography>

        <Typography component="div">
         <small>Fee: <strong className="text_blue">{this.props.fee} {this.props.to}</strong></small>
        </Typography>

        {
          this.state.tokenInfoFrom && this.state.tokenInfoFrom.hasOwnProperty('conversionFee')
          ?
          (
            <Typography component="div">
             <small>Converison fee: <strong className="text_blue">{this.state.tokenInfoFrom['conversionFee']} %</strong></small>
            </Typography>
          )
          :(null)
        }

        { // Addition info
          this.state.tokenInfoFrom && this.state.tokenInfoTo && this.state.tokenInfoFrom.hasOwnProperty('smartTokenSupply') && this.state.tokenInfoTo.hasOwnProperty('smartTokenSupply')
          ?
          (
            <React.Fragment>
            <Typography component="div">
             <small>{this.props.from} relay supply: <strong className="text_blue">{fromWei(this.state.tokenInfoFrom['smartTokenSupply'])}</strong></small>
            </Typography>

           {/* <Typography component="div">
             <small>{this.props.from} reserve: <strong className="text_blue">{fromWei(this.state.tokenInfoFrom['connectorOriginalReserve'])}&nbsp;{this.props.from} and {fromWei(this.state.tokenInfoFrom['connectorBancorReserve'])}&nbsp;{this.state.tokenInfoFrom['connectorType']}</strong></small>
            </Typography> */}

            <Typography component="div">
             <small>{this.props.to} relay supply: <strong className="text_blue">{fromWei(this.state.tokenInfoTo['smartTokenSupply'])}</strong></small>
            </Typography>

          {/*  <Typography component="div">
             <small>{this.props.to} reserve: <strong className="text_blue">{fromWei(this.state.tokenInfoTo['connectorOriginalReserve'])}&nbsp;{this.props.to} and {fromWei(this.state.tokenInfoTo['connectorBancorReserve'])}&nbsp;{this.state.tokenInfoTo['connectorType']}</strong></small>
            </Typography> */}
            </React.Fragment>
          )
          :
          (null)
        }
      </Paper>
      </React.Fragment>
      )
      :
      (null)
    }
    </React.Fragment>
   )
  }
}

export default DirectionInfo
