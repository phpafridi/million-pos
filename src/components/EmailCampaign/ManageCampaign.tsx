import React from 'react'

export default function ManageCampaign() {
  return (
    <>
    
    <section className="content">
    <div className="row">
        <div className="col-md-12">

            <div className="box box-primary ">
                <div className="box-header box-header-background with-border">
                        <h3 className="box-title ">Manage Campaign</h3>
                </div>


                <div className="box-body">

                    <div className="table-responsive">
                        
                        <table className="table table-bordered table-striped" id="dataTables-example">
                            <thead >
                            <tr>
                                <th className="active">Sl</th>
                                <th className="active">Campaign Name</th>
                                <th className="active">Email Subject</th>
                                <th className="active">Create Date</th>
                                <th className="active">Created by</th>
                                <th className="active ">Action</th>

                            </tr>
                            </thead>
                            <tbody>
                                <tr className="custom-tr">
                                    <td className="vertical-td">
                                       
                                    </td>
                                    <td className="vertical-td"></td>
                                    <td className="vertical-td"></td>
                                    <td className="vertical-td"></td>
                                    <td className="vertical-td"></td>


                                    <td className="vertical-td" id="sendEmail">
                                        <div className="btn-group">
                                            <form method="post" action="<?php echo base_url() ?>admin/campaign/send_email" >
                                                    <button type="submit" data-original-title="Send Email"   className="btn bg-purple btn-xs"  data-toggle="tooltip" data-placement="top"><i className="glyphicon glyphicon-envelope"></i></button>
                                      
                                                    <input type="hidden" name="campaign_id" value="<?php echo $v_campaign->campaign_id ?>" />
                                            </form>
                                        </div>
                                    </td>

                                </tr>
                         
                                <td colSpan={6}>
                                    <strong>There is no record for display</strong>
                                </td>
                            </tbody>
                        </table> 
                    </div>
                </div>
            </div>
            
        </div>
       
    </div>
    
</section>

    </>
  )
}
