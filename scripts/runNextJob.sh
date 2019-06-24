#!/bin/bash

#  Copyright 2019, Jared Sagendorf, All rights reserved.
#  
#  Correspondance can be sent by e-mail to Jared Sagendorf <sagendor@usc.edu>
#  
#  This program is free software; you can redistribute it and/or modify
#  it under the terms of the GNU General Public License as published by
#  the Free Software Foundation; either version 2 of the License, or
#  (at your option) any later version.
#  
#  This program is distributed in the hope that it will be useful,
#  but WITHOUT ANY WARRANTY; without even the implied warranty of
#  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#  GNU General Public License for more details.

readonly PROGNAME=$(basename "$0")
readonly LOCK_FD=200
readonly LOCKFILE_DIR="/tmp"
readonly QUEUE_FILE="/srv/www/htdocs/uploads/queue.dat"
readonly UPLOADS_DIR="/srv/www/htdocs/uploads"
readonly SCRIPT_DIR="/srv/www/scripts"
readonly PIPELINE_DIR="/home/sagendor/bin/pipeline"
readonly 
lock() {
    local prefix=$1
    local fd=${2:-$LOCK_FD}
    local lock_file=$LOCKFILE_DIR/$prefix.lock

    # create lock file
    eval "exec $fd>$lock_file"

    # acquier the lock
    flock -n $fd \
        && return 0 \
        || return 1
}

eexit() {
    # exit code options:
    #   0 - job was processed sucessfully, exit normally
    #   1 - attempted to process job, but something failed
    #   2 - lockfile was busy or nothing in queue (don't pop queue)
    
    # perform cleanup operations
    if [ "$2" ]; then
        # remove left over files
        DELETE=(auxiliary.par bestpairs.pdb bp_helical.par bp_order.dat bp_step.par \
        cf_7methods.par hbadd.bonds hbadd.map hbdebug.dat hel_regions.pdb hstacking.pdb \
        poc_haxis.r3d ref_frames.dat stacking.pdb)
        
        for file in ${DELETE[@]}; do
            if [ -f $file ]; then
                rm $file
            fi
        done
        
        for file in $2*; do
            if [ $file == "$2.cif" ]; then continue; fi
            if [ $file == "$2.json" ]; then continue; fi
            if [ $file == "$2.pdb" ]; then continue; fi
            if [ $file == "$2-info.json" ]; then continue; fi
            
            rm $file
        done
    fi
    
    if [ $1 -ne 2 ]; then
        # pop the job from the queue
        tail -n +2 "$QUEUE_FILE" > "$QUEUE_FILE.tmp" && mv "$QUEUE_FILE.tmp" "$QUEUE_FILE"
    fi
    
    # goodbye
    exit $1
}

main() {
    # first check if we have access to the lockfile, otherwise exit
    lock $PROGNAME \
        || eexit 2
    
    # check if there is any jobs to process, if not exit
    if [ -s $QUEUE_FILE ]; then
        # now get the next JOB_ID from the queue file
        local line=( `head -n 1 $QUEUE_FILE` )
        local JOBID=${line[0]}
        local flag=${line[1]}
    else
        eexit 2
    fi
    
    # source environment variables
    export PATH="/home/conda/bin:$PATH"
    export PATH="/home/sagendor/bin:$PATH"
    export PATH="/home/sagendor/bin/src/x3dna-v2.3/bin:$PATH"
    export X3DNA='/home/sagendor/bin/src/x3dna-v2.3'
    cd $UPLOADS_DIR
    
    # run processStructure
    $PIPELINE_DIR/processStructure.py $JOBID $flag --no_meta
    if [ $? == 1 ]; then
		if [ ! -f $JOBID.json ]; then        
			LOG=`grep $JOBID logfile.txt | tail -n 1`
        	echo '{"error": "processing error", "message": "'"$LOG"'"}' > $JOBID.json
		fi        
		$SCRIPT_DIR/notify.py $JOBID
        eexit 1 $JOBID
    else
        # notify the user that their job is ready
        $SCRIPT_DIR/notify.py $JOBID
    fi
    
    # cleanup
    eexit 0 $JOBID
}
main

