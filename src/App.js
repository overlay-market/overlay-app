import React, { Component } from 'react';
import {
  Accordion,
  Alert,
  Button,
  ButtonGroup,
  ButtonToolbar,
  Card,
  Col,
  Container,
  Dropdown,
  DropdownButton,
  Form,
  FormControl,
  InputGroup,
  ListGroup,
  Modal,
  Nav,
  Navbar,
  Row,
  Spinner,
  Toast,
  ToggleButtonGroup,
  ToggleButton,
} from 'react-bootstrap';
import Eth from 'web3-eth';
import Utils from 'web3-utils';
import TradingViewWidget, { BarStyles } from 'react-tradingview-widget';
import numeral from 'numeral';
import * as firebase from "firebase/app";
import "firebase/firestore";
import "firebase/functions";
import { library } from '@fortawesome/fontawesome-svg-core';
import { faSync } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import bannerSrc from './banner.png';
import metaMaskSrc from './metamask.svg';
import constants from './constants';
import './App.css';
import config from './config';
import AlertDismissible from './components/alertDismissible';

library.add(faSync);

var hostNetworkVersion = "42"; // kovan default, for now ...
var chains = { "rinkeby": "4", "kovan": "42" };
if (window.location.hostname.split(".")[0] in chains) {
  hostNetworkVersion = chains[window.location.hostname.split(".")[0]];
}

class App extends Component {
  constructor(props, context) {
    super(props, context);

    // Function bindings
    this.handleShow = this.handleShow.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleShowUnwindModal = this.handleShowUnwindModal.bind(this);
    this.handleCloseUnwindModal = this.handleCloseUnwindModal.bind(this);
    this.handleFeedChange = this.handleFeedChange.bind(this);
    this.handleBuildPositionReceipt = this.handleBuildPositionReceipt.bind(this);
    this.submitInviteCode = this.submitInviteCode.bind(this);
    this.addFunds = this.addFunds.bind(this);
    this.getQuote = this.getQuote.bind(this);
    this.getOpenPositions = this.getOpenPositions.bind(this);
    this.getLiquidatablePositions = this.getLiquidatablePositions.bind(this);
    this.buildPosition = this.buildPosition.bind(this);
    this.unwindPosition = this.unwindPosition.bind(this);
    this.liquidatePosition = this.liquidatePosition.bind(this);

    this.state = {
      total: {},
      account: null,
      allowance: 999999999999 * 1e18,
      positions: null,
      balance: null,
      tokenAddress: config.contracts[hostNetworkVersion].tokenAddress,
      claimAddress: config.contracts[hostNetworkVersion].claimAddress,
      hasClaimed: false,
      amountToClaim: 0,
      posToUnwind: null,
      feeds: config.contracts[hostNetworkVersion].feeds,
      inviteCode: '',
      feed: config.contracts[hostNetworkVersion].feeds["CHAINLINK-BTCUSD"],
      show: false,
      showUnwindModal: false,
      pendingTxHashes: [],
      showPendingTx: false,
      loadingPrice: false,
      loadingPositions: false,
      loadingLiquidatablePositions: false,
      loadingApproval: false,
      loadingFunds: false,
      loadingTrade: false,
      side: 1, // either 1 for long or -1 for short
      amount: '',
      view: 'build', // TODO: react router
      leverage: 1,
    };
  }

  handleClose() {
    this.setState({ show: false, side: 1, amount: '', leverage: 1 });
  }

  handleShow() {
    this.setState({ show: true });
  }

  handleCloseUnwindModal() {
    this.setState({ showUnwindModal: false, amount: '', posToUnwind: null });
  }

  handleShowUnwindModal(pos) {
    this.setState({ showUnwindModal: true, posToUnwind: pos });
  }

  async handleFeedChange(e) {
    const { feeds } = this.state;
    await this.setState({ feed: feeds[e.target.value], allowance: 99999999999 * 1e18 });
    await this.initializeFeed();
    await this.initializeAllowance();
    await this.initializePositions();
  }

  submitInviteCode = async () => {
    const { account, inviteCode } = this.state;
    try {
      // Fund a new account w OVL
      var balance = (await firebase.functions().httpsCallable('fundAccount')({ account, inviteCode })).data;
      this.setState({ balance });

      // Refresh the total stats
      await this.initializeTotalStats();
    } catch (err) {
      console.error(err);
      alert('Not able to fund your account');
    }
  }

  addFunds = async () => {
    const { account, amountToClaim, balance, claimAddress, tokenAddress } = this.state;
    try {
      // Mark as loading
      this.setState({ loadingFunds: true });

      // Fund a new account w OVL
      const eth = new Eth(window.ethereum);
      const claimContract = new eth.Contract(config.dev.ovlClaimABI, claimAddress);
      const self = this;
      claimContract.methods.withdraw()
        .send({ 'from': account })
        .on('transactionHash', (hash) => {
          // Update state based on position, balances
          self.addPendingTxHash(hash);
          self.setState({ hasClaimed: true, loadingFunds: false });
        })
        .on('receipt', (receipt) => {
          console.log('receipt', receipt);
          console.log('prev balance', balance);
          console.log('claims withdrawn', amountToClaim); // TODO: Fix balance being off after claim!
          const newBalance = balance + amountToClaim; // TODO: Set up listener for OVL token burns on total
          console.log('new balance', newBalance);
          self.setState({ balance: newBalance });
        })
        .on('error', (error) => {
          console.error(error);
          // TODO: alert ...
        });

      // var balance = (await firebase.functions().httpsCallable('fundAccount')({ account })).data;
      this.setState({ balance, loadingFunds: false });
    } catch (err) {
      console.error(err);
      this.setState({ loadingFunds: false });
      alert('Not able to fund your account');
    }
  }

  getQuote = async () => {
    const { feeds, feed } = this.state;
    try {
      // Mark as loading
      this.setState({ loadingPrice: true });

      // Fetch price quote from oracle for active feed in modal
      const eth = new Eth(window.ethereum);
      const feedContract = new eth.Contract(config.dev[feed.feedABIType], feed.feedAddress);
      const obj = await feedContract.methods.data().call();
      const price = obj[0];
      const period = obj[1];
      console.log('price:', price);
      console.log('period:', period);

      // Store price value in feeds and feed of state
      feeds[feed.symbol].price = feed.price = price;
      feeds[feed.symbol].period = feed.period = period;
      this.setState({ feeds, feed, loadingPrice: false });
    } catch (err) {
      console.error(err);
      this.setState({ loadingPrice: false });
      //alert('Not able to get quote at this time');
    }
  }

  getOpenPositions = async () => {
    const { feeds, feed } = this.state;
    try {
      // Mark as loading
      this.setState({ loadingPositions: true });

      // Fetch open positions for market
      const eth = new Eth(window.ethereum);
      const fPosContract = new eth.Contract(config.dev.ovlFPositionABI, feed.marketAddress);
      const op = await fPosContract.methods.open().call();

      feeds[feed.symbol].open = feed.open = op;
      this.setState({ feeds, feed, loadingPositions: false });
    } catch (err) {
      console.error(err);
      this.setState({ loadingPositions: false });
    }
  }

  getLiquidatablePositions = async () => {
    const { feeds, feed } = this.state;
    try {
      // Mark as loading
      this.setState({ loadingLiquidatablePositions: true });

      // Fetch open positions for market
      const eth = new Eth(window.ethereum);
      const fPosContract = new eth.Contract(config.dev.ovlFPositionABI, feed.marketAddress);
      const liq = await fPosContract.methods.liquidatable().call();

      console.log('liquidatable pos ids:', liq);
      const liquidatable = liq.filter((id) => id !== "0");
      console.log('liquidatable pos ids filtered:', liquidatable);

      feeds[feed.symbol].liquidatable = feed.liquidatable = liquidatable;
      this.setState({ feeds, feed, loadingLiquidatablePositions: false });
    } catch (err) {
      console.error(err);
      this.setState({ loadingLiquidatablePositions: false });
    }
  }

  approveMarket = async () => {
    const { account, feed, tokenAddress } = this.state;
    try {
      // Mark as loading
      this.setState({ loadingAllowance: true });

      // Fetch price quote from oracle for active feed in modal
      const eth = new Eth(window.ethereum);
      const tokenContract = new eth.Contract(config.dev.ovlTokenABI, tokenAddress);
      const tx = await tokenContract.methods.approve(
        feed.marketAddress,
        Utils.toWei('999999999999', "ether"),
      ).send({ 'from': account }); // TODO: gasPrice ...

      // Store allowance
      const allowance = 999999999999 * 1e18; // get from tx.Approval event value
      this.setState({ allowance, loadingPrice: false });
    } catch (err) {
      console.error(err);
      this.setState({ loadingAllowance: false });
    }
  }

  buildPosition = async () => {
    const { feed, feeds, account, balance, amount, side, leverage, total, allowance } = this.state;
    try {
      if (!amount) {
        throw new Error('Amount of OVL is required');
      } else if (!feed.price) {
        throw new Error('Need price quote from oracle');
      }

      // Mark as loading
      this.setState({ loadingTrade: true });

      console.log('amount', amount);
      console.log('amount type', typeof amount);
      console.log('balance', balance);
      const eth = new Eth(window.ethereum);
      const fPosContract = new eth.Contract(config.dev.ovlFPositionABI, feed.marketAddress);
      console.log('amount to send', this.applyBaseFactor(parseFloat(amount), total.decimals));
      console.log('long to send', (side === 1));
      console.log('leverage to send', this.applyBaseFactor(leverage, total.decimals));
      const amountToSend = this.applyBaseFactor(parseFloat(amount), total.decimals);
      if (amountToSend > balance) {
        throw new Error('Position amount must not be larger than OVL balance'); // TODO: gray out button in this case (on input event)
      } else if (amountToSend > allowance) {
        throw new Error('Position amount must not be larger than OVL allowance for market'); // NOTE: this should never happen!
      }

      const self = this;
      const leverageToSend = this.applyBaseFactor(leverage, total.decimals);
      fPosContract.methods.build(
        amountToSend.toString(),
        (side === 1),
        leverageToSend.toString(),
      ).send({ 'from': account })
        .on('transactionHash', (hash) => {
          // Update state based on position, balances
          self.addPendingTxHash(hash);
          self.setState({ amount: '', side: 1, leverage: 1, loadingTrade: false });
          // Close the modal
          self.handleClose();
        })
        .on('receipt', async (receipt) => {
          self.handleBuildPositionReceipt(fPosContract, feed, receipt);
        })
        .on('error', (error) => {
          console.error(error);
          // TODO: alert ...
        });
    } catch (err) {
      console.error(err);
      this.setState({ loadingTrade: false });
      alert(`Error executing trade: ${err.message}`);
    }
  }

  handleBuildPositionReceipt = async (fPosContract, buildFeed, receipt) => {
    const { feeds, feed, balance } = this.state;
    // Get the details of the Build event
    console.log('build pos receipt', receipt);
    console.log('build pos receipt fposcontract', fPosContract);
    console.log('build pos receipt buildFeed', buildFeed);
    console.log('build pos receipt current feed', feed);
    const id = receipt.events.Build.returnValues.id;
    const amount = parseFloat(receipt.events.Build.returnValues.value);

    console.log('build pos receipt prev balance', balance);
    const newBalance = balance - amount;
    console.log('build pos receipt new balance', newBalance);

    const long = await fPosContract.methods.isLong(id).call();
    const leverage = await fPosContract.methods.leverageOf(id).call();
    const lockPrice = await fPosContract.methods.lockPriceOf(id).call();
    const liquidationPrice = await fPosContract.methods.liquidationPriceOf(id).call();
    const pos = { id, amount, long, leverage: parseFloat(leverage), lockPrice: parseFloat(lockPrice), liquidationPrice: parseFloat(liquidationPrice) };
    console.log('build pos receipt pos', pos);

    feeds[buildFeed.symbol].positions[id] = pos;
    if (feed.symbol === buildFeed.symbol) {
      feed.positions[id] = pos;
    }
    this.setState({ feeds, feed, balance: newBalance });
  }

  unwindPosition = async () => {
    const { feed, feeds, account, amount, total, posToUnwind } = this.state;
    const pos = posToUnwind;
    try {
      if (!amount) {
        throw new Error('Amount of OVL is required');
      } else if (!feed.price) {
        throw new Error('Need price quote from oracle');
      } else if (posToUnwind === null) {
        throw new Error('Need pos to unwind');
      }

      // Mark as loading
      this.setState({ loadingTrade: true });

      console.log('amount', amount);
      console.log('amount type', typeof amount);
      console.log('pos amount', pos.amount);
      console.log('pos amount type', typeof pos.amount);
      console.log('pos id', pos.id);
      const eth = new Eth(window.ethereum);
      const fPosContract = new eth.Contract(config.dev.ovlFPositionABI, feed.marketAddress);
      console.log('amount to send', this.applyBaseFactor(parseFloat(amount), total.decimals));
      console.log('pos id to send', pos.id);
      const amountToSend = this.applyBaseFactor(parseFloat(amount), total.decimals);
      if (amountToSend > pos.amount) {
        throw new Error('Amount to unwind must not be larger than OVL amount locked'); // TODO: gray out button in this case (on input event)
      }

      const self = this;
      fPosContract.methods.unwind(
        pos.id,
        amountToSend.toString(),
      ).send({ 'from': account })
        .on('transactionHash', (hash) => {
          // Update state based on position, balances
          self.addPendingTxHash(hash);
          self.setState({ amount: '', loadingTrade: false });
          // Close the modal
          self.handleCloseUnwindModal();
        })
        .on('receipt', (receipt) => {
          // TODO: update pos in feed attrs ...
          console.log('receipt', receipt);
          console.log('prev amount', amount);
          console.log('amount sent', amountToSend);
          const newAmount = pos.amount - amountToSend; // TODO: Set up listener for OVL token burns on total
          console.log('new amount', newAmount);
          // self.setState({ feeds, feed });
        })
        .on('error', (error) => {
          console.error(error);
          // TODO: alert ...
        });
    } catch (err) {
      console.error(err);
      this.setState({ loadingTrade: false });
      alert(`Error executing trade: ${err.message}`);
    }
  }

  liquidatePosition = async (posId) => {
    const { feed, account } = this.state;
    try {
      console.log('pos id', posId);

      if (!posId) {
        throw new Error('Need pos to liquidate');
      } else if (!account) {
        throw new Error('Need account to liquidate');
      }

      // Mark as loading
      // this.setState({ loadingTrade: true });

      const eth = new Eth(window.ethereum);
      const fPosContract = new eth.Contract(config.dev.ovlFPositionABI, feed.marketAddress);
      // console.log('amount to send', this.applyBaseFactor(parseFloat(amount), total.decimals));
      console.log('pos id to send', posId);

      const self = this;
      fPosContract.methods.liquidate(
        posId,
      ).send({ 'from': account })
        .on('transactionHash', (hash) => {
          // Update state based on position, balances
          self.addPendingTxHash(hash);
          //self.setState({ amount: '', loadingTrade: false });
        })
        .on('receipt', (receipt) => {
          // TODO: update pos in feed attrs ...
          console.log('receipt', receipt);
          // self.setState({ feeds, feed });
        })
        .on('error', (error) => {
          console.error(error);
          // TODO: alert ...
        });
    } catch (err) {
      console.error(err);
      //this.setState({ loadingTrade: false });
      alert(`Error executing liquidation: ${err.message}`);
    }
  }

  getLiquidationPrice = () => {
    const { feed, balance, leverage, side, amount } = this.state;
    if (feed.price == '') {
      return 0;
    }

    const price = this.removeBaseFactor(feed.price, feed.decimals);
    if (side === 1) {
      // long: liquidate = lockPrice * (1-1/leverage); liquidate when pnl = -amount so no debt
      return price * (1 - 1 / leverage);
    } else {
      // short: liquidate = lockPrice * (1+1/leverage)
      return price * (1 + 1 / leverage);
    }
  }

  applyBaseFactor(amount, decimals) {
    const base = Math.pow(10, decimals);
    return amount * base;
  }

  removeBaseFactor(amount, decimals) {
    const base = Math.pow(10, decimals);
    return amount / base;
  }

  renderClaim() {
    const { hasClaimed, loadingFunds } = this.state;
    if (hasClaimed) {
      return (<></>);
    }

    if (loadingFunds) {
      return (
        <Button
          variant="secondary"
          className="mx-2"
          size="sm"
          type="button"
        >
          <Spinner
            as="span"
            animation="border"
            size="sm"
            role="status"
            aria-hidden="true"
          />
          <span className="sr-only">Loading...</span>
        </Button>
      );
    } else {
      return (
        <Button
          variant="secondary"
          className="mx-2"
          size="sm"
          type="button"
          onClick={this.addFunds}
        >
          Add Funds
        </Button>
      );
    }
  }

  renderBalance() {
    const { balance, loadingFunds, total } = this.state;
    if (balance !== 0) {
      return (
        <div className="text-right px-2">
          <span>Balance: <strong>{this.removeBaseFactor(balance, total.decimals)} OVL</strong></span>
        </div>
      );
    } else {
      if (loadingFunds) {
        return (
          <Button
            variant="primary"
            className="mx-2"
            size="sm"
            type="button"
          >
            <Spinner
              as="span"
              animation="border"
              size="sm"
              role="status"
              aria-hidden="true"
            />
            <span className="sr-only">Loading...</span>
          </Button>
        );
      } else {
        return (
          <Button
            variant="primary"
            className="mx-2"
            size="sm"
            type="button"
            onClick={this.addFunds}
          >
            Add Funds
          </Button>
        );
      }
    }
  }

  renderTotalNav() {
    const { total } = this.state;
    return (
      <Navbar bg="light" className="justify-content-center border-bottom">
        <small>Total Supply: <strong>{(total.supply ? `${this.removeBaseFactor(total.supply, total.decimals)} OVL` : '')}</strong></small>
      </Navbar>
    );
  }

  renderAccount() {
    const { account, balance } = this.state;
    if (account) {
      return (
        <div className="d-flex align-items-center justify-content-end">
          {this.renderClaim()}
          {this.renderBalance()}
          <Button variant="light">
            {`${account.substring(0, 6)}...${account.substring(account.length - 4)}`}
          </Button>
        </div>
      );
    } else {
      return (
        <Button variant="light" onClick={this.initializeAccount}>
          <img
            src={metaMaskSrc}
            className="d-inline-block align-top pr-2 pt-1"
            alt="MetaMask logo"
          />
          MetaMask
        </Button>
      );
    }
  }

  renderModal() {
    const { feed, balance, leverage } = this.state;
    return (
      <Modal id="trade-modal" size="lg" show={this.state.show} onHide={this.handleClose}>
        <Modal.Header closeButton>
          <strong>Build a {feed.name} Position</strong>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <TradingViewWidget
              symbols={[feed.chartSymbol]}
              width='100%'
              height='150'
              widgetType='MiniWidget'
            />
            <Form.Label className="mt-3">Price <small className="text-muted">(Last Oracle Price: {numeral(feed.period / (3600.0)).format('0,00.0')}h TWAP; {numeral(feed.period / (3600.0 * feed.rounds)).format('0,00.0')}h Sampling Period)</small></Form.Label>
            {this.renderPriceInModal()}
            <Form.Label>Side</Form.Label>
            <ButtonToolbar className="mb-3">
              <ToggleButtonGroup
                type="radio"
                name="side"
                defaultValue={1}
                onChange={(val, e) => this.setState({ side: val })}
              >
                <ToggleButton variant="light" value={1}>Long</ToggleButton>
                <ToggleButton variant="light" value={-1}>Short</ToggleButton>
              </ToggleButtonGroup>
            </ButtonToolbar>
            <Form.Label>Amount</Form.Label>
            <InputGroup className="mb-3">
              <FormControl
                id="trade-amount"
                type="number"
                placeholder="0.000"
                step="0.001"
                aria-label="Amount"
                aria-describedby="btnGroupAddon"
                onChange={(e) => this.setState({ amount: e.target.value })}
              />
              <InputGroup.Append>
                <InputGroup.Text id="btnGroupAddon">OVL</InputGroup.Text>
              </InputGroup.Append>
            </InputGroup>
            <Form.Label>Leverage: {leverage}x <small className="text-muted">(Liquidation Price Est.: {this.getLiquidationPrice()} {feed.denom})</small></Form.Label>
            <InputGroup>
              <Form.Control
                id="trade-leverage"
                type="range"
                aria-label="Leverage"
                min={1}
                max={10}
                value={leverage}
                step={0.05}
                onChange={(e) => this.setState({ leverage: e.target.value })}
              />
            </InputGroup>
          </Form>
        </Modal.Body>
        <Modal.Footer className="d-flex justify-content-between align-items-center">
          <div className="d-flex flex-column">
            <small>Fee: <strong>0.15%</strong></small>
          </div>
          {this.renderModalButton()}
        </Modal.Footer>
      </Modal>
    );
  }

  renderUnwindModal() {
    const { posToUnwind, feed, total } = this.state;
    if (posToUnwind === null) {
      return (<></>);
    }
    const pos = posToUnwind;
    return (
      <Modal id="uwind-modal" show={this.state.showUnwindModal} onHide={this.handleCloseUnwindModal}>
        <Modal.Header closeButton>
          <strong>Unwind Your {feed.name} Position</strong>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Label><strong>{this.removeBaseFactor(pos.leverage, total.decimals)}x {pos.long ? "Long" : "Short"} @ {this.removeBaseFactor(pos.lockPrice, feed.decimals)} {feed.denom}</strong></Form.Label>
            <Form.Label className="mt-2">Price <small className="text-muted">(Last Oracle Price: {numeral(feed.period / (3600.0)).format('0,00.0')}h TWAP; {numeral(feed.period / (3600.0 * feed.rounds)).format('0,00.0')}h Sampling Period)</small></Form.Label>
            {this.renderPriceInModal()}
            <Form.Label>Amount Locked</Form.Label>
            <InputGroup className="mb-3">
              <span className="h4">{this.removeBaseFactor(pos.amount, total.decimals)}</span>
            </InputGroup>
            <Form.Label>PnL</Form.Label>
            <InputGroup className="mb-3">
              <div className="d-flex align-items-center">
                <span className="h4">{this.removeBaseFactor(this.calcPnL(pos), total.decimals * 2)} OVL {this.calcPnLPerc(pos) > 0 ? <small className="text-success">{this.calcPnLPerc(pos)}%</small> : <small className="text-danger">{this.calcPnLPerc(pos)}%</small>}</span>
              </div>
            </InputGroup>
            <Form.Label>Amount to Unwind</Form.Label>
            <InputGroup className="mb-3">
              <FormControl
                id="trade-amount"
                type="number"
                placeholder="0.000"
                step="0.001"
                aria-label="Amount"
                aria-describedby="btnGroupAddon"
                onChange={(e) => this.setState({ amount: e.target.value })}
              />
              <InputGroup.Append>
                <InputGroup.Text id="btnGroupAddon">OVL</InputGroup.Text>
              </InputGroup.Append>
            </InputGroup>
          </Form>
        </Modal.Body>
        <Modal.Footer className="d-flex justify-content-between align-items-center">
          <div className="d-flex flex-column">
            <small>Fee: <strong>0.15%</strong></small>
          </div>
          {this.renderUnwindModalButton()}
        </Modal.Footer>
      </Modal>
    );
  }

  renderPositionInModal() {
    const { positions, feed } = this.state;
    const symbol = feed.symbol;
    if (positions && symbol in positions) {
      const position = positions[symbol];

      var sign;
      switch (Math.sign(position.amount)) {
        case 1:
          sign = '+';
          break;
        case -1:
          sign = '-';
          break;
        default:
          sign = '';
      }

      return (
        <small className="d-flex justify-content-start mb-2">
          <div>Locked: <strong>{`${sign}${Math.abs(position.amount)}`} OVL</strong></div>
          <small className="px-2">&middot;</small>
          <div>Avg Price: <strong>{(position.averagePrice ? `${position.averagePrice} ${feed.denom}` : '-')}</strong></div>
        </small>
      );
    } else {
      return (
        <small className="d-flex justify-content-start mb-2">
          <div>Locked: <strong>0.000 OVL</strong></div>
          <small className="px-2">&middot;</small>
          <div>Avg Price: <strong>-</strong></div>
        </small>
      );
    }
  }

  renderPriceInModal() {
    const { balance, feed, loadingPrice } = this.state;
    if (loadingPrice) {
      return (
        <InputGroup className="mb-3">
          <Button variant="primary">
            <Spinner
              as="span"
              animation="border"
              size="sm"
              role="status"
              aria-hidden="true"
            />
            <span className="sr-only">Loading...</span>
          </Button>
        </InputGroup>
      );
    } else if (feed.price === '' && balance) {
      return (
        <InputGroup className="mb-3">
          <Button variant="primary" type="button" onClick={this.getQuote}>Get Quote From Oracle</Button>
        </InputGroup>
      );
    } else if (feed.price === '' && !balance) {
      return (
        <InputGroup className="mb-3">
          <Button variant="primary" type="button" disabled>Get Quote From Oracle</Button>
        </InputGroup>
      );
    } else {
      return (
        <InputGroup className="mb-3">
          <div className="d-flex align-items-center">
            <span className="h4">{this.removeBaseFactor(feed.price, feed.decimals)} {feed.denom}</span>
            <Button className="ml-2" variant="link" size="sm" onClick={this.getQuote}>
              <FontAwesomeIcon icon="sync" />
            </Button>
          </div>
        </InputGroup>
      );
    }
  }

  renderModalButton() {
    const { balance, feed, loadingTrade } = this.state;
    if (balance && feed.price) {
      if (loadingTrade) {
        return (
          <Button variant="primary" type="button">
            <Spinner
              as="span"
              animation="border"
              size="sm"
              role="status"
              aria-hidden="true"
            />
            <span className="sr-only">Loading...</span>
          </Button>
        );
      } else {
        return (
          <Button variant="primary" type="button" onClick={this.buildPosition}>
            Build
          </Button>
        );
      }
    } else {
      return (
        <Button variant="primary" type="button" disabled>
          Build
        </Button>
      );
    }
  }

  renderUnwindModalButton() {
    const { balance, feed, loadingTrade } = this.state;
    if (feed.price) {
      if (loadingTrade) {
        return (
          <Button variant="primary" type="button">
            <Spinner
              as="span"
              animation="border"
              size="sm"
              role="status"
              aria-hidden="true"
            />
            <span className="sr-only">Loading...</span>
          </Button>
        );
      } else {
        return (
          <Button variant="primary" type="button" onClick={this.unwindPosition}>
            Unwind
          </Button>
        );
      }
    } else {
      return (
        <Button variant="primary" type="button" disabled>
          Unwind
        </Button>
      );
    }
  }

  addPendingTxHash(hash) {
    const { pendingTxHashes } = this.state;
    pendingTxHashes.push(hash);
    this.setState({ pendingTxHashes, showPendingTx: true });
  }

  getPendingTxHashURL(hash) {
    const networkName = Object.keys(chains).find(key => chains[key] === hostNetworkVersion);
    if (networkName === "mainnet") {
      return `https://etherscan.io/tx/${hash}`;
    } else {
      return `https://${networkName}.etherscan.io/tx/${hash}`;
    }
  }

  removePendingTxHash(hash) {
    var { pendingTxHashes } = this.state;
    const i = pendingTxHashes.indexOf(hash);
    if (i > -1) {
      pendingTxHashes = pendingTxHashes.splice(i, 1);
      this.setState({ pendingTxHashes, showPendingTx: false });
      console.log('pendingTxHashes', this.state.pendingTxHashes);
    }
  }

  renderToasts() {
    const { pendingTxHashes, showPendingTx } = this.state;
    const hash = pendingTxHashes[pendingTxHashes.length - 1];
    if (!hash) {
      return (<></>);
    }
    return (
      <Navbar fixed="bottom" className="d-flex justify-content-center">
        <Toast show={showPendingTx} onClose={() => this.removePendingTxHash(hash)}>
          <Toast.Header>
            <strong className="mr-auto">Submitted</strong>
          </Toast.Header>
          <Toast.Body><strong>Tx Hash:</strong> <a href={this.getPendingTxHashURL(hash)} target="_blank">{`${hash.substring(0, 8)}...${hash.substring(hash.length - 8, hash.length)}`}</a></Toast.Body>
        </Toast>
      </Navbar>
    );
  }

  renderAlert() {
    const body = "The system is still under research. This is a testnet implementation prior to changes needed for long-term stability and robustness.";
    return (
      <AlertDismissible
        variant="warning"
        header="Warning"
        body={body}
      />
    );
  }

  renderSelectFeed() {
    const { feeds, feed } = this.state;
    return (
      <Form.Control as="select" className="my-2" defaultValue={feed.symbol} onChange={this.handleFeedChange}>
        {
          Object.keys(feeds).map(symbol => {
            const feed = feeds[symbol];
            return (<option value={symbol}>{symbol}</option>);
          })}
      </Form.Control>
    );
  }

  renderPriceInFeed() {
    const { feed, loadingPrice } = this.state;
    if (loadingPrice) {
      return (
        <Spinner
          as="span"
          animation="border"
          size="sm"
          role="status"
          aria-hidden="true"
        />
      );
    } else if (feed.price !== '') {
      return (<div>{this.removeBaseFactor(feed.price, feed.decimals)} {feed.denom} <small className="text-muted"><small>({numeral(feed.period / (3600.0)).format('0,00.0')}h TWAP)</small></small><Button className="ml-1" variant="link" size="sm" onClick={this.getQuote}><FontAwesomeIcon icon="sync" /></Button></div>);
    } else {
      return (<></>);
    }
  }

  renderBuildPositionButton() {
    const { account, allowance, feed, loadingApproval } = this.state;
    if (allowance > 0 || !account) {
      return (<Button variant="primary" size="md" type="button" onClick={this.handleShow} disabled={(account === null)}>Build New Position</Button>);
    } else {
      if (loadingApproval) {
        return (
          <Button variant="outline-primary" size="md" type="button">
            <Spinner
              as="span"
              animation="border"
              size="sm"
              role="status"
              aria-hidden="true"
            />
            <span className="sr-only">Loading...</span>
          </Button>
        );
      } else {
        return (<Button variant="outline-primary" size="md" onClick={this.approveMarket} type="button">Approve {feed.name}</Button>);
      }
    }
  }

  renderPositionInFeed() {
    const { positions, feed, balance, account } = this.state;
    const symbol = feed.symbol;
    if (positions && symbol in positions) {
      const position = positions[symbol];
      return (
        <div className="d-flex justify-content-between align-items-center">
          <small>
            <strong>Your Current Positions</strong>
            <div>Locked: <strong>{(Math.abs(position.amount) > 0.0 ? (Math.sign(position.amount) === 1 ? 'Long ' : 'Short ') : ' ')}{Math.abs(position.amount)} OVL</strong></div>
            <div>Avg Price: <strong>{(position.averagePrice ? `${position.averagePrice} ${feed.denom}` : '-')}</strong></div>
          </small>
          {this.renderBuildPositionButton()}
        </div>
      );
    } else {
      // TODO: else if (balance)
      return (
        <div className="d-flex justify-content-between align-items-center">
          <small>
            <strong>Your Current Positions</strong>
            <div>Locked: <strong>{(balance ? '0.000 OVL' : '-')}</strong></div>
            <div>Avg Price: <strong>-</strong></div>
          </small>
          {this.renderBuildPositionButton()}
        </div>
      );
    }
  }

  renderBuild() {
    const { feed } = this.state;
    return (
      <Card>
        <Card.Body>
          <Card.Title className="d-flex justify-content-between align-items-start">
            <div>{feed.name}</div>
            {this.renderPriceInFeed()}
          </Card.Title>
          <Card.Text>
            <TradingViewWidget
              symbol={feed.chartSymbol}
              style={BarStyles.CANDLES}
              width='100%'
              height='325'
              allow_symbol_change={false}
              show_popup_button
            />
          </Card.Text>
          {this.renderPositionInFeed(feed.symbol)}
        </Card.Body>
      </Card>
    );
  }

  calcPnL(pos) {
    const { feed } = this.state;
    const size = pos.leverage * pos.amount;
    const side = (pos.long ? 1 : -1);
    return side * size * (feed.price - pos.lockPrice) / pos.lockPrice;
  }

  calcPnLPerc(pos) {
    const { feed } = this.state;
    const side = (pos.long ? 1 : -1);
    return 100 * side * (feed.price - pos.lockPrice) / pos.lockPrice;
  }

  renderUnwind() {
    const { feed, total, loadingPositions } = this.state;
    if (loadingPositions) {
      return (
        <div className="pb-5">
          <hr />
          <h5>Your Positions</h5>
          <div className="d-flex flex-wrap justify-content-between">
            <Spinner
              as="span"
              animation="border"
              size="sm"
              role="status"
              aria-hidden="true"
            />
          </div>
        </div>
      );
    }

    return (
      <div className="pb-5">
        <hr />
        <h5>Your Positions</h5>
        <div className="d-flex flex-wrap justify-content-between">
          {Object.values(feed.positions).map((pos) => (
            <Card key={pos.id} className="m-2" style={{ width: '18rem' }}>
              <Card.Body>
                <Card.Title>{pos.long ? "Long" : "Short"} {feed.name}</Card.Title>
                <Card.Subtitle>@ {this.removeBaseFactor(pos.lockPrice, feed.decimals)} {feed.denom}</Card.Subtitle>
                <Card.Text className="pt-3 pb-2">
                  <div>Amount: <strong>{this.removeBaseFactor(pos.amount, total.decimals)} OVL</strong></div>
                  <div>Leverage: <strong>{this.removeBaseFactor(pos.leverage, total.decimals)}x</strong></div>
                  <div className='py-2 d-flex flex-column'>
                    <small>Liquidation Price: <strong>{this.removeBaseFactor(pos.liquidationPrice, feed.decimals)} {feed.denom}</strong></small>
                    <small>PnL: <strong>{this.removeBaseFactor(this.calcPnL(pos), total.decimals * 2)} OVL {this.calcPnLPerc(pos) !== 0 ? this.calcPnLPerc(pos) > 0 ? <span className="text-success">{this.calcPnLPerc(pos)}%</span> : <span className="text-danger">{this.calcPnLPerc(pos)}%</span> : <></>}</strong></small>
                  </div>
                </Card.Text>
              </Card.Body>
              <Card.Footer>
                <Button variant="primary" size="sm" onClick={() => this.handleShowUnwindModal(pos)}>Unwind Position</Button>
              </Card.Footer>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  renderLiquidate() {
    const { feed, feeds, total, account } = this.state;
    return (
      <div className="pb-5">
        <hr />
        <h5>Outstanding Liquidatable Positions</h5>
        <div className="d-flex flex-wrap justify-content-between">
          {Object.values(feed.positionsLiquidatable).map((pos) => (
            <Card key={pos.id} className="m-2" style={{ width: '18rem' }}>
              <Card.Body>
                <Card.Title>{pos.long ? "Long" : "Short"} {feed.name}</Card.Title>
                <Card.Subtitle>@ {this.removeBaseFactor(pos.lockPrice, feed.decimals)} {feed.denom}</Card.Subtitle>
                <Card.Text className="pt-3 pb-2">
                  <div>Total Amount Locked: <strong>{this.removeBaseFactor(pos.amount, total.decimals)} OVL</strong></div>
                  <div>Leverage: <strong>{this.removeBaseFactor(pos.leverage, total.decimals)}x</strong></div>
                  <div className='py-2 d-flex flex-column'>
                    <small>Liquidation Price: <strong>{this.removeBaseFactor(pos.liquidationPrice, feed.decimals)} {feed.denom}</strong></small>
                  </div>
                </Card.Text>
              </Card.Body>
              <Card.Footer>
                <Button variant="primary" size="sm" onClick={async () => this.liquidatePosition(pos.id)} disabled={account === null}>Liquidate Position</Button>
              </Card.Footer>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  renderMain() {
    const { view } = this.state;
    switch (view) {
      case 'build':
        return this.renderBuild();
        break;
      case 'unwind':
        return this.renderUnwind();
        break;
      case 'liquidate':
        return this.renderLiquidate();
        break;
      default:
        console.error('in not supported view');
    }

  }

  render() {
    const { view } = this.state;
    return (
      <Container>
        <div className="fixed-top">
          {this.renderTotalNav()}
          <Navbar bg="light" variant="light" className="border-bottom">
            <Navbar.Brand>
              <img
                src={bannerSrc}
                height="35"
                className="d-inline-block align-top"
                alt="React Bootstrap logo"
              />
            </Navbar.Brand>
            <Navbar.Collapse>
              <Nav className="mr-auto">
                <Nav.Link active={(view === 'build')} onClick={() => this.setState({ view: 'build' })}>Build</Nav.Link>
                <Nav.Link active={(view === 'unwind')} onClick={() => this.setState({ view: 'unwind' })}>Unwind</Nav.Link>
                <Nav.Link active={(view === 'liquidate')} onClick={() => this.setState({ view: 'liquidate' })}>Liquidate</Nav.Link>
              </Nav>
            </Navbar.Collapse>
            {this.renderAccount()}
          </Navbar>
        </div>
        {this.renderModal()}
        {this.renderUnwindModal()}
        <Container className="App">
          {this.renderAlert()}
          {this.renderSelectFeed()}
          {this.renderMain()}
          {this.renderToasts()}
        </Container>
      </Container>
    );
  }

  initializeMetaMask = async () => {
    // Fetch ethereum accounts from MetaMask
    if (typeof window.ethereum === undefined) {
      alert('MetaMask not supported by this browser');
      return;
    }

    try {
      const ethereum = window.ethereum;
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      const account = accounts[0];

      // Check whether conditions met to trade w account
      if (!(ethereum.networkVersion in config.contracts)) {
        alert(`This application only works on ${Object.keys(chains)} ... for now`);
        return;
      } else if (ethereum.networkVersion !== hostNetworkVersion) {
        const networkName = Object.keys(chains).find(key => chains[key] === hostNetworkVersion);
        alert(`Connect to ${networkName} to trade`);
      } else if (!account) {
        alert('Create a MetaMask account to trade');
        return;
      }
      // Store the account
      this.setState({ account });
    } catch (error) {
      console.error(error);
    }
  }

  initializeBalance = async () => {
    // From firebase (but eventually from smart contract)
    // Balance { locked, unlocked }
    const { account, tokenAddress } = this.state;
    console.log('account:', account);
    try {
      const eth = new Eth(window.ethereum);
      const tokenContract = new eth.Contract(config.dev.ovlTokenABI, tokenAddress);
      const balance = await tokenContract.methods.balanceOf(account).call();
      console.log('account', account);
      console.log('balance', balance);
      if (!balance) {
        balance = null;
      }
      this.setState({ balance });
    } catch (error) {
      console.error(error);
    }
  }

  initializeClaim = async () => {
    const { account, claimAddress } = this.state;
    console.log('account:', account);
    try {
      const eth = new Eth(window.ethereum);
      const claimContract = new eth.Contract(config.dev.ovlClaimABI, claimAddress);
      const hasClaimed = await claimContract.methods.hasClaimed(account).call();
      const amountToClaim = await claimContract.methods.amount().call();
      console.log('has claimed', hasClaimed);
      console.log('claim amount', amountToClaim);
      this.setState({ hasClaimed, amountToClaim });
    } catch (error) {
      console.error(error);
    }
  }

  initializePositions = async () => {
    const { account, feeds, feed } = this.state;
    if (feed.open.length === 0) {
      return;
    }

    try {
      // Mark as loading
      this.setState({ loadingPositions: true });

      // Batch fetch balances for open positions on market
      const eth = new Eth(window.ethereum);
      const fPosContract = new eth.Contract(config.dev.ovlFPositionABI, feed.marketAddress);

      var accs = [];
      for (var i = 0; i < feed.open.length; i++) {
        accs.push(account);
      }
      console.log('assemble pos accs:', accs);
      console.log('assemble pos open:', feed.open);

      const amounts = await fPosContract.methods.balanceOfBatch(accs, feed.open).call();
      console.log('assemble amounts:', amounts);
      var positions = {};
      // TODO: set up a json endpoint for id uri instead of this?
      for (var i = 0; i < amounts.length; i++) {
        const id = feed.open[i];
        const amount = parseFloat(amounts[i]);
        if (amount === 0) {
          continue;
        }

        const long = await fPosContract.methods.isLong(id).call();
        const leverage = await fPosContract.methods.leverageOf(id).call();
        const lockPrice = await fPosContract.methods.lockPriceOf(id).call();
        const liquidationPrice = await fPosContract.methods.liquidationPriceOf(id).call();
        positions[id] = { id, amount, long, leverage: parseFloat(leverage), lockPrice: parseFloat(lockPrice), liquidationPrice: parseFloat(liquidationPrice) };
      }

      console.log('assembled positions', positions);
      feeds[feed.symbol].positions = feed.positions = positions;
      this.setState({ feeds, feed, loadingPositions: false });
    } catch (err) {
      console.error(err);
      this.setState({ loadingPositions: false });
    }
  }

  initializePositionsLiquidatable = async () => {
    const { feeds, feed } = this.state;
    if (feed.liquidatable.length === 0) {
      return;
    }

    try {
      // Mark as loading
      this.setState({ loadingLiquidatablePositions: true });

      // Batch fetch balances for open positions on market
      const eth = new Eth(window.ethereum);
      const fPosContract = new eth.Contract(config.dev.ovlFPositionABI, feed.marketAddress);

      var positionsLiquidatable = {};
      // TODO: set up a json endpoint for id uri instead of this?
      for (var i = 0; i < feed.liquidatable.length; i++) {
        const id = feed.liquidatable[i];
        const amountLockedIn = await fPosContract.methods.amountLockedIn(id).call();
        const amount = parseFloat(amountLockedIn);
        const long = await fPosContract.methods.isLong(id).call();
        const leverage = await fPosContract.methods.leverageOf(id).call();
        const lockPrice = await fPosContract.methods.lockPriceOf(id).call();
        const liquidationPrice = await fPosContract.methods.liquidationPriceOf(id).call();
        positionsLiquidatable[id] = { id, amount, long, leverage: parseFloat(leverage), lockPrice: parseFloat(lockPrice), liquidationPrice: parseFloat(liquidationPrice) };
      }

      console.log('assembled liquidatable positions', positionsLiquidatable);
      feeds[feed.symbol].positionsLiquidatable = feed.positionsLiquidatable = positionsLiquidatable;
      this.setState({ feeds, feed, loadingLiquidatablePositions: false });
    } catch (err) {
      console.error(err);
      this.setState({ loadingLiquidatablePositions: false });
    }
  }

  initializeAllowance = async () => {
    const { account, feed, tokenAddress } = this.state;
    if (account === null) {
      return;
    }

    try {
      // Mark as loading
      this.setState({ loadingAllowance: true });

      // Fetch price quote from oracle for active feed in modal
      const eth = new Eth(window.ethereum);
      const tokenContract = new eth.Contract(config.dev.ovlTokenABI, tokenAddress);
      const allowance = await tokenContract.methods.allowance(account, feed.marketAddress).call();
      console.log('allowance:', allowance);

      // Store allowance amount
      this.setState({ allowance: allowance, loadingAllowance: false });
    } catch (err) {
      console.error(err);
    }
  }

  initializeTotalStats = async () => {
    const { tokenAddress, account } = this.state;
    // TODO: make sure have eth context
    // SEE: https://github.com/iearn-finance/iearn-finance/blob/y/src/stores/store.jsx#L1273
    // TODO: https://web3js.readthedocs.io/en/v1.3.0/getting-started.html
    const eth = new Eth(window.ethereum);
    const tokenContract = new eth.Contract(config.dev.ovlTokenABI, tokenAddress);

    const supply = await tokenContract.methods.totalSupply().call();
    const decimals = await tokenContract.methods.decimals().call();
    const total = { supply, decimals };
    this.setState({ total });

    // Set up listeners for mint/burn events
    const self = this;
    tokenContract.events.Transfer()
      .on('data', async (event) => {
        console.log('new token transfer event:', event);
        if (event.returnValues.from === "0x0000000000000000000000000000000000000000" || event.returnValues.to === "0x0000000000000000000000000000000000000000") {
          // mint
          console.log('previous supply', supply);

          const fetchedSupply = await tokenContract.methods.totalSupply().call();
          const newSupply = parseFloat(fetchedSupply);
          self.setState({ total: { supply: newSupply, decimals: decimals } });
          console.log('new supply', newSupply);
        }
      });
  }

  // Initializes the current feed ...
  initializeFeed = async () => {
    const { feed, feeds } = this.state;
    await this.getQuote();
    await this.getOpenPositions();
    await this.getLiquidatablePositions();
    await this.initializePositionsLiquidatable();
  }

  initializeFeeds = async () => {
    const { feeds } = this.state,
      feedSnapshot = (await firebase.firestore().collection("feeds").get());

    // Get all of the feeds to extract last updated prices
    feedSnapshot.forEach(doc => {
      const { symbol, price } = doc.data(),
        feed = feeds[symbol];

      if (feed) {
        feed.lastPrice = price;
      }
    });

    // Update the state with new feeds list
    this.setState({ feeds });
  }

  initializeAccount = async () => {
    await this.initializeMetaMask();
    await this.initializeBalance();
    await this.initializeClaim();
    await this.initializePositions();
    await this.initializeAllowance();

  }

  initializeMetaMaskListeners = () => {
    if (window.ethereum && typeof window.ethereum !== undefined) {
      window.ethereum.on('accountsChanged', async (accounts) => {
        var account = accounts[0];
        if (!account) {
          account = null;
        }
        // Set account state and reset balance, positions state
        this.setState({ account, balance: null, positions: null });
        await this.initializeBalance();
        await this.initializePositions();
      });
    }
  }

  initializeListeners = () => {
    this.initializeMetaMaskListeners();
    // TODO: add token.mint/burn listeners ... for supply changes
  }

  componentDidMount = async () => {
    // Initialize Firebase
    firebase.initializeApp(constants.firebase.config);

    // TODO: Initialize web3 provider

    // Initialize total metrics: circulating supply, reserve supply of OVL, etc.
    await this.initializeTotalStats();

    // Initialize feeds: get last prices
    // await this.initializeFeeds();
    await this.initializeFeed();

    // Initialize listeners for event changes
    this.initializeListeners();
  }
}

export default App;
