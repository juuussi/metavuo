import React from 'react';
import axios from 'axios';
import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogActions from '@material-ui/core/DialogActions';
import { ValidatorForm, TextValidator } from 'react-material-ui-form-validator';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import PropTypes from 'prop-types';

class UpdateInfoDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      title: '',
      content: '',
      message: '',
      infoIsSet: true,
      updating: false,
    };
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.getContent = this.getContent.bind(this);
  }

  getContent() {
    axios.get('/api/info')
      .then((res) => {
        if (res.data !== null) {
          this.setState({ title: res.data.title || '', content: res.data.content || '' });
        }
      })
      .catch((err) => {
        if (err.response.status === 404) {
          this.setState({ message: 'No info text set yet. Create new one.', infoIsSet: false });
        } else {
          this.setState({ message: 'Problem getting data' });
        }
      });
  }

  handleChange(event) {
    this.setState({ [event.target.name]: event.target.value });
  }

  handleSubmit() {
    this.setState({ updating: true });
    const request = {
      method: 'PUT',
      url: '/api/admin/info',
      data: JSON.stringify({ title: this.state.title, content: this.state.content }),
    };
    if (!this.state.infoIsSet) {
      request.method = 'POST';
    }

    axios(request)
      .then((res) => {
        if (res.status === 200) {
          this.props.closeDialog();
        }
        this.setState({ updating: false });
      })
      .catch(() => {
        this.setState({ message: 'Problem updating info', updating: false });
      });
  }

  render() {
    return (
      <Dialog
        open={this.props.dialogOpen}
        onClose={this.props.closeDialog}
        onEnter={this.getContent}
        fullWidth
        maxWidth="md"
        disableBackdropClick
      >
        <DialogTitle className="dialog-header">Update info text</DialogTitle>
        <DialogContent>
          <p className="message-errors">{this.state.message}</p>
          <DialogContentText>
            This text is shown in info text view. New lines are shown in content.
          </DialogContentText>
          {this.state.updating && <CircularProgress />}
          <ValidatorForm
            onSubmit={this.handleSubmit}
            autoComplete="off"
          >
            <TextValidator
              id="title"
              name="title"
              label="Title"
              value={this.state.title}
              onChange={this.handleChange}
              margin="normal"
              fullWidth
              validators={['maxStringLength:500']}
              errorMessages={['Maximum length is 500 characters.']}
            />
            <TextValidator
              id="content"
              name="content"
              label="Content"
              multiline
              rowsMax="1000"
              value={this.state.content}
              onChange={this.handleChange}
              margin="normal"
              fullWidth
            />
            <DialogActions>
              <Button variant="raised" className="secondary-button text-button" onClick={this.props.closeDialog}>
                <i className="material-icons text-button-icon">close</i>Cancel
              </Button>
              <Button
                type="submit"
                variant="raised"
                className="primary-button text-button"
                disabled={this.state.updating}
              >
                <i className="material-icons text-button-icon">save</i>Save
              </Button>
            </DialogActions>
          </ValidatorForm>
        </DialogContent>
      </Dialog>
    );
  }
}

UpdateInfoDialog.propTypes = {
  dialogOpen: PropTypes.bool.isRequired,
  closeDialog: PropTypes.func.isRequired,
};

export default UpdateInfoDialog;
