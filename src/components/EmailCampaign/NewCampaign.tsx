import React from 'react'

export default function NewCampaign() {
    return (
        <>

            <section className="content">
                <div className="row">
                    <div className="col-md-12">

                        <div className="box box-primary">
                            <div className="box-header box-header-background with-border">
                                <h3 className="box-title ">Create New Email Campaign</h3>
                            </div>

                            <form role="form" id="addCustomerForm" method="post">

                                <div className="row">

                                    <div className="col-md-10 col-sm-12 col-xs-12">

                                        <div className="box-body">




                                            <div className="form-group">
                                                <label >Campaign Name <span className="required">*</span></label>
                                                <input type="text" name="campaign_name" placeholder="Campaign Name" required

                                                    className="form-control" />
                                            </div>

                                            <div className="form-group">
                                                <label>Email Subject <span
                                                    className="required">*</span></label>
                                                <input type="text" placeholder="Email Subject" name="subject" required
                                                    className="form-control" />
                                            </div>



                                            <div className="form-group">
                                                <label>Email Body<span className="required">*</span></label>
                                                <textarea name="email_body" className="form-control autogrow" required>

                                                </textarea>

                                            </div>


                                        </div>
                                    </div>
                                </div>



                                <div className="box-footer">
                                    <button type="submit" id="customer_btn" className="btn bg-navy btn-flat">Create Campaign
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </section>

        </>
    )
}
